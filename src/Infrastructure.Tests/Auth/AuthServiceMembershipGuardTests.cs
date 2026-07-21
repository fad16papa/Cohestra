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
using Cohestra.Infrastructure.Tenancy;
using Cohestra.Infrastructure.Tenants;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
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

        var result = await harness.Auth.LoginAsync("orphan@test.local", "ChangeMe123!", "localhost");

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

        var result = await harness.Auth.LoginAsync("platform@test.local", "ChangeMe123!", "localhost");

        Assert.NotNull(result.Tokens);
        Assert.Null(result.ErrorCode);
    }

    [Fact]
    public async Task Register_resume_blocked_when_bootstrap_closed()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var confirmed = await harness.CreateUserAsync(
            "admin@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            confirmed.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var pending = await harness.CreateUserAsync(
            "pending@test.local",
            "ChangeMe123!",
            emailConfirmed: false,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            pending.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var (response, error) = await harness.Auth.RegisterAsync(
            new RegisterOperatorRequest("pending@test.local", "Pending Op", "ChangeMe123!"));

        Assert.Null(response);
        Assert.Contains("already has a tenant admin", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task VerifyEmail_blocked_when_bootstrap_closed()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var confirmed = await harness.CreateUserAsync(
            "admin@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            confirmed.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var pending = await harness.CreateUserAsync(
            "pending@test.local",
            "ChangeMe123!",
            emailConfirmed: false,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            pending.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var (tokens, error) = await harness.Auth.VerifyEmailAsync(
            new VerifyEmailOtpRequest("pending@test.local", "123456"),
            "localhost");

        Assert.Null(tokens);
        Assert.Contains("already has a tenant admin", error, StringComparison.OrdinalIgnoreCase);
        Assert.False((await harness.GetUserAsync(pending.Id)).EmailConfirmed);
    }

    [Fact]
    public async Task Refresh_orphan_revokes_without_consuming_rotation()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var orphan = await harness.CreateUserAsync(
            "orphan@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);

        const string refreshToken = "orphan-refresh-token";
        await harness.RefreshTokens.StoreAsync(refreshToken, orphan.Id, tenantId: null, TimeSpan.FromHours(1));

        var result = await harness.Auth.RefreshAsync(refreshToken, "localhost");

        Assert.Null(result.Tokens);
        Assert.Equal("no_tenant_membership", result.ErrorCode);
        Assert.Equal(0, harness.RefreshTokens.ConsumeCount);
        Assert.Equal(1, harness.RefreshTokens.RevokeCount);
        Assert.Null(await harness.RefreshTokens.GetSessionAsync(refreshToken));
    }

    [Fact]
    public async Task Login_binds_tenant_id_from_host_membership()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var admin = await harness.CreateUserAsync(
            "admin@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var result = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "localhost");

        Assert.NotNull(result.Tokens);
        Assert.Contains(TenantIds.Default.ToString(), result.Tokens!.AccessToken, StringComparison.Ordinal);
        Assert.Contains("TenantAdmin", result.Tokens.AccessToken, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Login_fails_when_membership_is_on_other_tenant_only()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var otherTenantId = await harness.SeedTenantAsync("other", "Other");
        var admin = await harness.CreateUserAsync(
            "admin@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, otherTenantId, TenantMembershipRole.TenantAdmin);

        var result = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "localhost");

        Assert.Null(result.Tokens);
        Assert.Equal("no_tenant_membership", result.ErrorCode);
        Assert.Contains("not a member of this workspace", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Refresh_preserves_stored_tenant_id()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var admin = await harness.CreateUserAsync(
            "admin@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var login = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "localhost");
        Assert.NotNull(login.Tokens);

        var refreshed = await harness.Auth.RefreshAsync(login.Tokens!.RefreshToken, "localhost");
        Assert.NotNull(refreshed.Tokens);
        Assert.Contains(TenantIds.Default.ToString(), refreshed.Tokens!.AccessToken, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Refresh_denies_when_stored_tenant_membership_removed()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var admin = await harness.CreateUserAsync(
            "admin@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var login = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "localhost");
        Assert.NotNull(login.Tokens);

        await harness.RemoveMembershipsAsync(admin.Id);

        var refreshed = await harness.Auth.RefreshAsync(login.Tokens!.RefreshToken, "localhost");
        Assert.Null(refreshed.Tokens);
        Assert.Equal("no_tenant_membership", refreshed.ErrorCode);
    }

    [Fact]
    public async Task Refresh_denies_on_marketing_apex_host()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var admin = await harness.CreateUserAsync(
            "admin@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var login = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "localhost");
        Assert.NotNull(login.Tokens);

        var refreshed = await harness.Auth.RefreshAsync(login.Tokens!.RefreshToken, "cohestra.app");
        Assert.Null(refreshed.Tokens);
        Assert.Equal("tenant_unresolved", refreshed.ErrorCode);
    }

    private sealed class AuthHarness : IAsyncDisposable
    {
        private readonly ServiceProvider _provider;

        private AuthHarness(
            ServiceProvider provider,
            AuthService auth,
            ITenantMembershipService membership,
            InMemoryRefreshTokenStore refreshTokens)
        {
            _provider = provider;
            Auth = auth;
            Membership = membership;
            RefreshTokens = refreshTokens;
        }

        public AuthService Auth { get; }

        public ITenantMembershipService Membership { get; }

        public InMemoryRefreshTokenStore RefreshTokens { get; }

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
            services.AddScoped<ITenantHostResolver, TenantHostResolver>();
            services.AddSingleton<IConfiguration>(new ConfigurationBuilder().Build());
            services.AddSingleton<IJwtTokenService>(new StubJwtTokenService());
            var refreshStore = new InMemoryRefreshTokenStore();
            services.AddSingleton<IRefreshTokenStore>(refreshStore);
            services.AddSingleton(refreshStore);
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
                provider.GetRequiredService<ITenantMembershipService>(),
                provider.GetRequiredService<InMemoryRefreshTokenStore>());
        }

        public async Task<Guid> SeedTenantAsync(string slug, string name)
        {
            var db = _provider.GetRequiredService<CohestraDbContext>();
            var id = Guid.CreateVersion7();
            var now = DateTimeOffset.UtcNow;
            db.Tenants.Add(new Tenant
            {
                Id = id,
                Slug = slug,
                Name = name,
                Status = TenantStatus.Active,
                BillingStatus = BillingStatus.Free,
                CreatedAt = now,
                UpdatedAt = now,
            });
            await db.SaveChangesAsync();
            return id;
        }

        public async Task RemoveMembershipsAsync(Guid userId)
        {
            var db = _provider.GetRequiredService<CohestraDbContext>();
            var rows = await db.TenantMemberships.Where(m => m.UserId == userId).ToListAsync();
            db.TenantMemberships.RemoveRange(rows);
            await db.SaveChangesAsync();
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

        public async Task<ApplicationUser> GetUserAsync(Guid userId)
        {
            var userManager = _provider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await userManager.FindByIdAsync(userId.ToString());
            Assert.NotNull(user);
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
            IList<string> roles,
            Guid? tenantId = null,
            TenantMembershipRole? membershipRole = null) =>
            ($"access-{user.Id}|tenant={tenantId}|role={membershipRole}", 900);
    }

    private sealed class InMemoryRefreshTokenStore : IRefreshTokenStore
    {
        private readonly Dictionary<string, RefreshTokenSession> _tokens = new(StringComparer.Ordinal);

        public int ConsumeCount { get; private set; }

        public int RevokeCount { get; private set; }

        public Task StoreAsync(
            string refreshToken,
            Guid userId,
            Guid? tenantId,
            TimeSpan ttl,
            CancellationToken cancellationToken = default)
        {
            _tokens[refreshToken] = new RefreshTokenSession(userId, tenantId);
            return Task.CompletedTask;
        }

        public Task<RefreshTokenSession?> GetSessionAsync(
            string refreshToken,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(_tokens.TryGetValue(refreshToken, out var session) ? session : null);

        public Task<RefreshTokenSession?> ConsumeAsync(
            string refreshToken,
            CancellationToken cancellationToken = default)
        {
            ConsumeCount++;
            if (!_tokens.Remove(refreshToken, out var session))
            {
                return Task.FromResult<RefreshTokenSession?>(null);
            }

            return Task.FromResult<RefreshTokenSession?>(session);
        }

        public Task RevokeAsync(string refreshToken, CancellationToken cancellationToken = default)
        {
            RevokeCount++;
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
