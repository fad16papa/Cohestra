using Cohestra.Application.Auth;
using Cohestra.Application.Email;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Auth;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Email;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenants;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class AuthServiceMembershipGuardTests
{
    [Fact]
    public async Task Register_blocked_when_default_has_confirmed_TenantAdmin_membership()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var confirmed = await harness.CreateUserAsync(
            "admin@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            confirmed.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var (response, error) = await harness.Auth.RegisterAsync(
            new RegisterOperatorRequest("second@test.local", "Second Op", "ChangeMe123!"));

        Assert.Null(response);
        Assert.Contains("already has a tenant admin", error, StringComparison.OrdinalIgnoreCase);

        var onboarding = await harness.Auth.GetOnboardingStatusAsync();
        Assert.False(onboarding.RegistrationAvailable);
    }

    [Fact]
    public async Task Register_still_available_when_only_unconfirmed_TenantAdmin_membership_exists()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var pending = await harness.CreateUserAsync(
            "pending@test.local",
            "ChangeMe123!",
            emailConfirmed: false,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            pending.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var onboarding = await harness.Auth.GetOnboardingStatusAsync();
        Assert.True(onboarding.RegistrationAvailable);

        var (response, error) = await harness.Auth.RegisterAsync(
            new RegisterOperatorRequest("other@test.local", "Other Op", "ChangeMe123!"));

        Assert.Null(error);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Login_denies_orphan_TenantAdmin_without_membership()
    {
        await using var harness = await AuthHarness.CreateAsync();
        await harness.CreateUserAsync(
            "orphan@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);

        var result = await harness.Auth.LoginAsync("orphan@test.local", "ChangeMe123!");

        Assert.Null(result.Tokens);
        Assert.Equal("no_tenant_membership", result.ErrorCode);
        Assert.Contains("not linked to a tenant", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_allows_PlatformAdmin_without_membership()
    {
        await using var harness = await AuthHarness.CreateAsync();
        await harness.CreateUserAsync(
            "platform@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [PlatformAdminSeeder.PlatformAdminRole]);

        var result = await harness.Auth.LoginAsync("platform@test.local", "ChangeMe123!");

        Assert.NotNull(result.Tokens);
        Assert.Null(result.ErrorCode);
    }

    private sealed class AuthHarness : IAsyncDisposable
    {
        private readonly ServiceProvider _provider;

        private AuthHarness(ServiceProvider provider, AuthService auth, ITenantMembershipService membership)
        {
            _provider = provider;
            Auth = auth;
            Membership = membership;
        }

        public AuthService Auth { get; }

        public ITenantMembershipService Membership { get; }

        public static async Task<AuthHarness> CreateAsync()
        {
            var services = new ServiceCollection();
            services.AddLogging();
            services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
            services.AddDbContext<CohestraDbContext>(options =>
                options.UseInMemoryDatabase(Guid.NewGuid().ToString()));
            services
                .AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
                {
                    options.Password.RequireDigit = false;
                    options.Password.RequireLowercase = false;
                    options.Password.RequireUppercase = false;
                    options.Password.RequireNonAlphanumeric = false;
                    options.Password.RequiredLength = 8;
                    options.User.RequireUniqueEmail = true;
                })
                .AddEntityFrameworkStores<CohestraDbContext>()
                .AddDefaultTokenProviders();

            services.AddScoped<ITenantMembershipService, TenantMembershipService>();
            services.AddSingleton<IJwtTokenService>(new StubJwtTokenService());
            services.AddSingleton<IRefreshTokenStore>(new InMemoryRefreshTokenStore());
            services.AddSingleton<IAuthOtpStore>(new InMemoryOtpStore());
            services.AddSingleton<IEmailSender>(new StubEmailSender());
            services.AddSingleton<IHostEnvironment>(new StubHostEnvironment());
            services.AddSingleton(Options.Create(new JwtSettings
            {
                SigningKey = "unit-test-signing-key-at-least-32-chars!",
                AccessTokenMinutes = 15,
                RefreshTokenHours = 24,
            }));
            services.AddSingleton(Options.Create(new AuthOtpSettings()));
            services.AddSingleton(Options.Create(new SendGridSettings()));
            services.AddScoped<AuthService>();

            var provider = services.BuildServiceProvider();
            var db = provider.GetRequiredService<CohestraDbContext>();
            var now = DateTimeOffset.UtcNow;
            db.Tenants.Add(new Tenant
            {
                Id = TenantIds.Default,
                Slug = TenantIds.DefaultSlug,
                Name = "Default",
                Status = TenantStatus.Active,
                BillingStatus = BillingStatus.Free,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await db.SaveChangesAsync();

            var roleManager = provider.GetRequiredService<RoleManager<IdentityRole<Guid>>>();
            await roleManager.CreateAsync(new IdentityRole<Guid>(OperatorSeeder.TenantAdminRole));
            await roleManager.CreateAsync(new IdentityRole<Guid>(PlatformAdminSeeder.PlatformAdminRole));

            return new AuthHarness(
                provider,
                provider.GetRequiredService<AuthService>(),
                provider.GetRequiredService<ITenantMembershipService>());
        }

        public async Task<ApplicationUser> CreateUserAsync(
            string email,
            string password,
            bool emailConfirmed,
            IEnumerable<string> roles)
        {
            var userManager = _provider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = new ApplicationUser
            {
                Id = Guid.NewGuid(),
                UserName = email,
                Email = email,
                Nickname = email.Split('@')[0],
                EmailConfirmed = emailConfirmed,
            };
            Assert.True((await userManager.CreateAsync(user, password)).Succeeded);
            foreach (var role in roles)
            {
                Assert.True((await userManager.AddToRoleAsync(user, role)).Succeeded);
            }

            return user;
        }

        public ValueTask DisposeAsync()
        {
            _provider.Dispose();
            return ValueTask.CompletedTask;
        }
    }

    private sealed class StubJwtTokenService : IJwtTokenService
    {
        public (string AccessToken, int ExpiresInSeconds) CreateAccessToken(
            ApplicationUser user,
            IList<string> roles) =>
            ($"access-{user.Id}", 900);
    }

    private sealed class InMemoryRefreshTokenStore : IRefreshTokenStore
    {
        private readonly Dictionary<string, Guid> _tokens = new(StringComparer.Ordinal);

        public Task StoreAsync(
            string refreshToken,
            Guid userId,
            TimeSpan ttl,
            CancellationToken cancellationToken = default)
        {
            _tokens[refreshToken] = userId;
            return Task.CompletedTask;
        }

        public Task<Guid?> GetUserIdAsync(string refreshToken, CancellationToken cancellationToken = default) =>
            Task.FromResult(_tokens.TryGetValue(refreshToken, out var userId) ? userId : (Guid?)null);

        public Task<Guid?> ConsumeAsync(string refreshToken, CancellationToken cancellationToken = default)
        {
            if (!_tokens.Remove(refreshToken, out var userId))
            {
                return Task.FromResult<Guid?>(null);
            }

            return Task.FromResult<Guid?>(userId);
        }

        public Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default)
        {
            _tokens.Remove(refreshToken);
            return Task.CompletedTask;
        }
    }

    private sealed class InMemoryOtpStore : IAuthOtpStore
    {
        public Task<bool> TryStoreAsync(
            string email,
            OtpPurpose purpose,
            string code,
            TimeSpan ttl,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(true);

        public Task<bool> ValidateAndConsumeAsync(
            string email,
            OtpPurpose purpose,
            string code,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(true);

        public Task<bool> TryRecordSendAttemptAsync(
            string email,
            OtpPurpose purpose,
            int maxAttempts,
            TimeSpan window,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(true);
    }

    private sealed class StubEmailSender : IEmailSender
    {
        public Task<EmailSendResult> SendAsync(
            EmailMessage message,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new EmailSendResult(true, "stub", null));
    }

    private sealed class StubHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "tests";
        public string ContentRootPath { get; set; } = "/tmp";
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }
}
