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

        var result = await harness.Auth.LoginAsync("orphan@test.local", "ChangeMe123!", "default.localhost");

        Assert.Null(result.Tokens);
        Assert.Equal("invalid_credentials", result.ErrorCode);
        Assert.Contains("Invalid email or password", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_masks_removed_member_as_invalid_credentials()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var member = await harness.CreateUserAsync(
            "member@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: []);
        await harness.Membership.EnsureMembershipAsync(
            member.Id, TenantIds.Default, TenantMembershipRole.TenantMember);
        await harness.RemoveMembershipsAsync(member.Id);

        var result = await harness.Auth.LoginAsync("member@test.local", "ChangeMe123!", "default.localhost");

        Assert.Null(result.Tokens);
        Assert.Equal("invalid_credentials", result.ErrorCode);
        Assert.Contains("Invalid email or password", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
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

        var result = await harness.Auth.LoginAsync("platform@test.local", "ChangeMe123!", "default.localhost");

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
    public async Task VerifyEmail_returns_rate_limited_after_failed_otp_threshold()
    {
        await using var harness = await AuthHarness.CreateAsync(useCountingOtpLimiter: true);
        var pending = await harness.CreateUserAsync(
            "pending@test.local",
            "ChangeMe123!",
            emailConfirmed: false,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            pending.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        for (var i = 0; i < 3; i++)
        {
            var (tokens, _, _) = await harness.Auth.VerifyEmailAsync(
                new VerifyEmailOtpRequest("pending@test.local", "000000"),
                "default.localhost",
                clientIp: "127.0.0.1");
            Assert.Null(tokens);
        }

        var (blockedTokens, blockedError, blockedCode) = await harness.Auth.VerifyEmailAsync(
            new VerifyEmailOtpRequest("pending@test.local", "000000"),
            "default.localhost",
            clientIp: "127.0.0.1");

        Assert.Null(blockedTokens);
        Assert.Equal(AuthErrorCodes.OtpVerifyRateLimited, blockedCode);
        Assert.Contains("Too many verification attempts", blockedError, StringComparison.OrdinalIgnoreCase);
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

        var (tokens, error, _) = await harness.Auth.VerifyEmailAsync(
            new VerifyEmailOtpRequest("pending@test.local", "123456"),
            "default.localhost",
            clientIp: null);

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

        var result = await harness.Auth.RefreshAsync(refreshToken, "default.localhost");

        Assert.Null(result.Tokens);
        Assert.Equal("invalid_refresh_token", result.ErrorCode);
        Assert.Equal(0, harness.RefreshTokens.ConsumeCount);
        Assert.Equal(1, harness.RefreshTokens.RevokeCount);
        Assert.Null(await harness.RefreshTokens.GetSessionAsync(refreshToken));
    }

    [Fact]
    public async Task Login_on_bare_localhost_with_dev_tenant_slug_returns_tokens_for_default_operator()
    {
        await using var harness = await AuthHarness.CreateAsync(devTenantSlug: "default");
        var admin = await harness.CreateUserAsync(
            "operator@cohestra.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var result = await harness.Auth.LoginAsync(
            "operator@cohestra.local",
            "ChangeMe123!",
            "localhost");

        Assert.NotNull(result.Tokens);
        Assert.Null(result.HandoffCode);
        Assert.Null(result.ErrorCode);
    }

    [Fact]
    public async Task Login_on_bare_localhost_with_dev_tenant_slug_resolves_other_membership()
    {
        await using var harness = await AuthHarness.CreateAsync(devTenantSlug: "default");
        var otherTenantId = await harness.SeedTenantAsync("load-core-alpha", "Load Core Alpha");
        var admin = await harness.CreateUserAsync(
            "load.core.alpha@cohestra.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, otherTenantId, TenantMembershipRole.TenantAdmin);

        var result = await harness.Auth.LoginAsync(
            "load.core.alpha@cohestra.local",
            "ChangeMe123!",
            "localhost");

        Assert.Null(result.Tokens);
        Assert.Null(result.ErrorCode);
        Assert.Equal("load-core-alpha", result.TenantSlug);
        Assert.False(string.IsNullOrWhiteSpace(result.HandoffCode));
    }

    [Fact]
    public async Task Login_on_marketing_apex_resolves_single_membership_and_returns_handoff()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var otherTenantId = await harness.SeedTenantAsync("load-core-alpha", "Load Core Alpha");
        var admin = await harness.CreateUserAsync(
            "load.core.alpha@cohestra.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, otherTenantId, TenantMembershipRole.TenantAdmin);

        var result = await harness.Auth.LoginAsync(
            "load.core.alpha@cohestra.local",
            "ChangeMe123!",
            "localhost");

        Assert.Null(result.Tokens);
        Assert.Null(result.ErrorCode);
        Assert.Equal("load-core-alpha", result.TenantSlug);
        Assert.False(string.IsNullOrWhiteSpace(result.HandoffCode));
        Assert.True(result.HandoffExpiresInSeconds > 0);
    }

    [Fact]
    public async Task Login_on_marketing_apex_fails_when_user_has_multiple_workspaces()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var tenantA = await harness.SeedTenantAsync("workspace-a", "Workspace A");
        var tenantB = await harness.SeedTenantAsync("workspace-b", "Workspace B");
        var admin = await harness.CreateUserAsync(
            "admin@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, tenantA, TenantMembershipRole.TenantAdmin);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, tenantB, TenantMembershipRole.TenantAdmin);

        var result = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "localhost");

        Assert.Null(result.Tokens);
        Assert.Equal("multiple_workspaces", result.ErrorCode);
        Assert.Contains("multiple workspaces", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Login_on_bare_localhost_ignores_default_backfill_when_real_workspace_exists()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var creativorareId = await harness.SeedTenantAsync("creativorare", "Creativorare");
        var admin = await harness.CreateUserAsync(
            "operator@example.com",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, creativorareId, TenantMembershipRole.TenantAdmin);

        var result = await harness.Auth.LoginAsync("operator@example.com", "ChangeMe123!", "localhost");

        Assert.Null(result.Tokens);
        Assert.Null(result.ErrorCode);
        Assert.Equal("creativorare", result.TenantSlug);
        Assert.False(string.IsNullOrWhiteSpace(result.HandoffCode));
    }

    [Fact]
    public async Task Login_on_marketing_apex_allows_user_with_other_tenant_membership_only()
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
        Assert.Null(result.ErrorCode);
        Assert.Equal("other", result.TenantSlug);
        Assert.False(string.IsNullOrWhiteSpace(result.HandoffCode));
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

        var result = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "default.localhost");

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

        var result = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "default.localhost");

        Assert.Null(result.Tokens);
        Assert.Equal("invalid_credentials", result.ErrorCode);
        Assert.Contains("Invalid email or password", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
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

        var login = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "default.localhost");
        Assert.NotNull(login.Tokens);

        var refreshed = await harness.Auth.RefreshAsync(login.Tokens!.RefreshToken, "default.localhost");
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

        var login = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "default.localhost");
        Assert.NotNull(login.Tokens);

        await harness.RemoveMembershipsAsync(admin.Id);

        var refreshed = await harness.Auth.RefreshAsync(login.Tokens!.RefreshToken, "default.localhost");
        Assert.Null(refreshed.Tokens);
        Assert.Equal("invalid_refresh_token", refreshed.ErrorCode);
    }

    [Fact]
    public async Task Refresh_allows_marketing_apex_host_when_stored_tenant_matches_membership()
    {
        await using var harness = await AuthHarness.CreateAsync();
        var admin = await harness.CreateUserAsync(
            "admin@test.local",
            "ChangeMe123!",
            emailConfirmed: true,
            roles: [OperatorSeeder.TenantAdminRole]);
        await harness.Membership.EnsureMembershipAsync(
            admin.Id, TenantIds.Default, TenantMembershipRole.TenantAdmin);

        var login = await harness.Auth.LoginAsync("admin@test.local", "ChangeMe123!", "default.localhost");
        Assert.NotNull(login.Tokens);

        var refreshed = await harness.Auth.RefreshAsync(login.Tokens!.RefreshToken, "cohestra.app");
        Assert.NotNull(refreshed.Tokens);
        Assert.Contains(TenantIds.Default.ToString(), refreshed.Tokens!.AccessToken, StringComparison.Ordinal);
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

        public static async Task<AuthHarness> CreateAsync(
            bool useCountingOtpLimiter = false,
            string? devTenantSlug = null)
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
            services.AddSingleton<ITenantAccessService>(new StubTenantAccessService());
            var configurationBuilder = new ConfigurationBuilder();
            if (!string.IsNullOrWhiteSpace(devTenantSlug))
            {
                configurationBuilder.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["DEV_TENANT_SLUG"] = devTenantSlug,
                });
            }

            services.AddSingleton<IConfiguration>(configurationBuilder.Build());
            services.AddSingleton<IJwtTokenService>(new StubJwtTokenService());
            var refreshStore = new InMemoryRefreshTokenStore();
            services.AddSingleton<IRefreshTokenStore>(refreshStore);
            services.AddSingleton(refreshStore);
            services.AddSingleton<IAuthOtpStore>(new InMemoryOtpStore());
            if (useCountingOtpLimiter)
            {
                services.AddSingleton<IAuthOtpVerifyRateLimiter>(
                    new CountingAuthOtpVerifyRateLimiter(maxFailures: 3));
            }
            else
            {
                services.AddSingleton<IAuthOtpVerifyRateLimiter>(new NoOpAuthOtpVerifyRateLimiter());
            }
            services.AddSingleton<IEmailSender>(new StubEmailSender());
            services.AddSingleton<IAuthHandoffStore>(new InMemoryAuthHandoffStore());
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

        public Task RevokeAllForUserAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            var keysToRemove = _tokens
                .Where(kvp => kvp.Value.UserId == userId)
                .Select(kvp => kvp.Key)
                .ToList();

            foreach (var key in keysToRemove)
            {
                RevokeCount++;
                _tokens.Remove(key);
            }

            return Task.CompletedTask;
        }
    }

    private sealed class NoOpAuthOtpVerifyRateLimiter : IAuthOtpVerifyRateLimiter
    {
        public Task<bool> AllowVerifyAsync(
            string email,
            string? clientIdentifier,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(true);

        public Task RecordFailedVerifyAsync(
            string email,
            string? clientIdentifier,
            CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task ClearFailuresAsync(
            string email,
            string? clientIdentifier,
            CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    private sealed class CountingAuthOtpVerifyRateLimiter(int maxFailures) : IAuthOtpVerifyRateLimiter
    {
        private readonly Dictionary<string, int> _failures = new(StringComparer.OrdinalIgnoreCase);

        public Task<bool> AllowVerifyAsync(
            string email,
            string? clientIdentifier,
            CancellationToken cancellationToken = default)
        {
            var key = BuildKey(email, clientIdentifier);
            _failures.TryGetValue(key, out var count);
            return Task.FromResult(count < maxFailures);
        }

        public Task RecordFailedVerifyAsync(
            string email,
            string? clientIdentifier,
            CancellationToken cancellationToken = default)
        {
            var key = BuildKey(email, clientIdentifier);
            _failures[key] = _failures.GetValueOrDefault(key) + 1;
            return Task.CompletedTask;
        }

        public Task ClearFailuresAsync(
            string email,
            string? clientIdentifier,
            CancellationToken cancellationToken = default)
        {
            _failures.Remove(BuildKey(email, clientIdentifier));
            return Task.CompletedTask;
        }

        private static string BuildKey(string email, string? clientIdentifier) =>
            $"{email.Trim().ToLowerInvariant()}|{clientIdentifier ?? "none"}";
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
            Task.FromResult(false);

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

    private sealed class StubTenantAccessService : ITenantAccessService
    {
        public Task<TenantAccessEvaluation> EvaluateAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(TenantAccessEvaluator.Evaluate(TenantStatus.Active, BillingStatus.Free));

        public Task<TenantUsageSnapshot> GetUsageAsync(
            Guid tenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(new TenantUsageSnapshot(1, 0, 0, 0));

        public Task TouchActivityAsync(Guid tenantId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;
    }

    private sealed class StubHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ApplicationName { get; set; } = "tests";
        public string ContentRootPath { get; set; } = "/tmp";
        public Microsoft.Extensions.FileProviders.IFileProvider ContentRootFileProvider { get; set; } =
            new Microsoft.Extensions.FileProviders.NullFileProvider();
    }

    private sealed class InMemoryAuthHandoffStore : IAuthHandoffStore
    {
        public Task<(string Code, int ExpiresInSeconds)> CreateAsync(
            AuthHandoffPayload payload,
            CancellationToken cancellationToken = default)
        {
            var code = Guid.NewGuid().ToString("N");
            return Task.FromResult((code, 120));
        }

        public Task<AuthHandoffPayload?> ExchangeAsync(
            string code,
            Guid expectedTenantId,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<AuthHandoffPayload?>(null);
    }
}
