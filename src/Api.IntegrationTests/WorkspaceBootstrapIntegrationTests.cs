using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Cohestra.Application.Email;
using Cohestra.Contracts.Auth;
using Cohestra.Contracts.Platform;
using Cohestra.Contracts.Team;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Identity;
using Cohestra.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Trait("Category", "TenantIsolation")]
[Collection(IntegrationTestCollection.Name)]
public sealed class WorkspaceBootstrapIntegrationTests(IntegrationTestFixture fixture)
{
    private const string Password = "ChangeMe123!";

    private IntegrationTestWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task ComplimentaryBasic_BootstrapInviteAcceptLogin_UsesSingleSeat()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = NewSlug();
        var email = $"owner-{slug}@example.com";
        using var platform = await PlatformClientAsync();
        var tenant = await CreateComplimentaryAsync(platform, slug, TenantPlan.Basic, email);

        using var bootstrap = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest(email),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, bootstrap.StatusCode);
        var created = await bootstrap.Content.ReadFromJsonAsync<BootstrapFirstAdminResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(created);
        Assert.Equal(email, created!.Email);

        var token = ReadInviteToken(email);
        Assert.False(string.IsNullOrWhiteSpace(token));

        using var duplicate = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest(email),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);
        Assert.Equal("bootstrap_conflict", await IntegrationTestHelpers.ReadProblemErrorCodeAsync(duplicate));

        using var acceptClient = Factory.CreateClient();
        using var blocked = await acceptClient.PostAsJsonAsync(
            "/api/v1/public/team/invites/accept",
            new AcceptTeamInviteRequest(token!, Password, "Beta Owner"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, blocked.StatusCode);
        Assert.Equal("activation_otp_required", await IntegrationTestHelpers.ReadProblemErrorCodeAsync(blocked));
        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            Assert.Null(await users.FindByEmailAsync(email));
        }

        using var accept = await ActivateWithOtpAsync(acceptClient, token!, email, "Beta Owner");
        Assert.Equal(HttpStatusCode.OK, accept.StatusCode);

        using var reused = await acceptClient.PostAsJsonAsync(
            "/api/v1/public/team/invites/accept",
            new AcceptTeamInviteRequest(token!, Password, "Beta Owner"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Conflict, reused.StatusCode);

        using var loginClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(loginClient, slug);
        var access = await IntegrationTestHelpers.LoginAsync(loginClient, email, Password);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(access);
        Assert.Contains(jwt.Claims, claim => claim.Type == "role" && claim.Value == "TenantAdmin");
        Assert.DoesNotContain(jwt.Claims, claim => claim.Type == JwtTokenService.PlatformAdminClaimType);
        Assert.Equal(tenant.Id.ToString(), jwt.Claims.Single(claim => claim.Type == "tenant_id").Value);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = await users.FindByEmailAsync(email);
            Assert.NotNull(user);
            Assert.False(await users.IsInRoleAsync(user!, PlatformAdminSeeder.PlatformAdminRole));
        }

        IntegrationTestHelpers.UseBearerToken(loginClient, access);
        using var ownTeam = await loginClient.GetAsync("/api/v1/admin/team");
        Assert.Equal(HttpStatusCode.OK, ownTeam.StatusCode);
        var overview = await ownTeam.Content.ReadFromJsonAsync<TeamOverviewResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(overview);
        Assert.Equal(1, overview!.SeatLimit);
        Assert.Equal(1, overview.ActiveMembers);
        Assert.True(overview.SeatCapReached);
        Assert.False(overview.InvitesAllowed);

        using var secondInvite = await loginClient.PostAsJsonAsync(
            "/api/v1/admin/team/invites",
            new CreateTeamInviteRequest($"extra-{slug}@example.com", "TenantMember"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Forbidden, secondInvite.StatusCode);
        Assert.Equal("plan_locked", await IntegrationTestHelpers.ReadProblemErrorCodeAsync(secondInvite));

        var otherSlug = NewSlug();
        var other = await CreateComplimentaryAsync(platform, otherSlug, TenantPlan.Basic, $"other-{otherSlug}@example.com");
        using var cross = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(cross, other.Slug);
        IntegrationTestHelpers.UseBearerToken(cross, access);
        using var crossTeam = await cross.GetAsync("/api/v1/admin/team");
        Assert.Equal(HttpStatusCode.Forbidden, crossTeam.StatusCode);

        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var audit = await db.PlatformAuditLogs.AsNoTracking()
                .SingleAsync(entry =>
                    entry.TenantId == tenant.Id
                    && entry.Action == PlatformAuditAction.FirstAdminBootstrapped);
            Assert.DoesNotContain(token!, audit.DetailsJson ?? string.Empty, StringComparison.Ordinal);
        }
    }

    [SkippableFact]
    public async Task Bootstrap_RejectsNonComplimentarySuspendedPlatformAdminAndExpiredToken()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        using var platform = await PlatformClientAsync();

        var paidSlug = NewSlug();
        using var paidResponse = await platform.PostAsJsonAsync(
            "/api/v1/platform/tenants",
            new CreateTenantRequest("Paid", paidSlug, "Basic", $"paid-{paidSlug}@example.com"),
            IntegrationTestHelpers.JsonOptions);
        paidResponse.EnsureSuccessStatusCode();
        var paid = await paidResponse.Content.ReadFromJsonAsync<TenantResponse>(IntegrationTestHelpers.JsonOptions);
        using var paidBootstrap = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{paid!.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest($"paid-{paidSlug}@example.com"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Conflict, paidBootstrap.StatusCode);

        var suspendedSlug = NewSlug();
        var suspendedEmail = $"sus-{suspendedSlug}@example.com";
        var suspended = await CreateComplimentaryAsync(platform, suspendedSlug, TenantPlan.Core, suspendedEmail);
        using var suspend = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{suspended.Id}/suspend",
            new SuspendTenantRequest("beta rehearsal"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, suspend.StatusCode);
        using var suspendedBootstrap = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{suspended.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest(suspendedEmail),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Conflict, suspendedBootstrap.StatusCode);

        var (platformUser, _) = await IntegrationTestHelpers.CreatePlatformAdminUserAsync(
            Factory.Services,
            $"padmin-{NewSlug()}@example.com");
        var blockedSlug = NewSlug();
        var blocked = await CreateComplimentaryAsync(
            platform,
            blockedSlug,
            TenantPlan.Basic,
            platformUser.Email!);
        using var escalation = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{blocked.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest(platformUser.Email!),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Conflict, escalation.StatusCode);

        var expireSlug = NewSlug();
        var expireEmail = $"exp-{expireSlug}@example.com";
        var expiring = await CreateComplimentaryAsync(platform, expireSlug, TenantPlan.Basic, expireEmail);
        using var expireBootstrap = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{expiring.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest(expireEmail),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, expireBootstrap.StatusCode);
        var expireToken = ReadInviteToken(expireEmail);
        await using (var scope = Factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
            var invite = await db.IgnoreTenantFilters<TenantInvite>()
                .SingleAsync(row => row.TenantId == expiring.Id && row.Email == expireEmail);
            invite.ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-5);
            await db.SaveChangesAsync();
        }

        using var acceptClient = Factory.CreateClient();
        using var expired = await acceptClient.PostAsJsonAsync(
            "/api/v1/public/team/invites/accept",
            new AcceptTeamInviteRequest(expireToken, Password, "Expired Owner"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, expired.StatusCode);

        using var member = Factory.CreateClient();
        var (memberUser, _) = await IntegrationTestHelpers.CreateTenantAdminUserAsync(
            Factory.Services,
            expiring.Id,
            $"member-{expireSlug}@example.com");
        IntegrationTestHelpers.UseTenantHost(member, expireSlug);
        IntegrationTestHelpers.UseBearerToken(
            member,
            IntegrationTestHelpers.MintTenantAccessToken(Factory.Services, memberUser, expiring.Id));
        using var forbidden = await member.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{expiring.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest($"nope-{expireSlug}@example.com"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
    }

    [SkippableFact]
    public async Task CompetingBootstrap_AllowsOneInvite()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = NewSlug();
        var email = $"race-{slug}@example.com";
        using var platform = await PlatformClientAsync();
        var tenant = await CreateComplimentaryAsync(platform, slug, TenantPlan.Pro, email);

        var first = platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest(email),
            IntegrationTestHelpers.JsonOptions);
        var second = platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest($"other-{email}"),
            IntegrationTestHelpers.JsonOptions);
        var responses = await Task.WhenAll(first, second);
        using var left = responses[0];
        using var right = responses[1];
        var statuses = new[] { left.StatusCode, right.StatusCode }.OrderBy(code => code).ToArray();
        Assert.Equal(HttpStatusCode.OK, statuses[0]);
        Assert.Equal(HttpStatusCode.Conflict, statuses[1]);

        await using var scope = Factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        var pending = await db.IgnoreTenantFilters<TenantInvite>()
            .CountAsync(row => row.TenantId == tenant.Id && row.AcceptedAt == null && row.RevokedAt == null);
        Assert.Equal(1, pending);
    }

    [SkippableFact]
    public async Task AcceptedAdmin_CannotLoginAfterSuspend()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slug = NewSlug();
        var email = $"live-{slug}@example.com";
        using var platform = await PlatformClientAsync();
        var tenant = await CreateComplimentaryAsync(platform, slug, TenantPlan.Basic, email);
        using var bootstrap = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest(email),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, bootstrap.StatusCode);

        using var acceptClient = Factory.CreateClient();
        using var accept = await ActivateWithOtpAsync(acceptClient, ReadInviteToken(email), email, "Live Owner");
        Assert.Equal(HttpStatusCode.OK, accept.StatusCode);

        using var suspend = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenant.Id}/suspend",
            new SuspendTenantRequest("stop beta access"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, suspend.StatusCode);

        using var loginClient = Factory.CreateClient();
        IntegrationTestHelpers.UseTenantHost(loginClient, slug);
        using var login = await loginClient.PostAsJsonAsync(
            "/api/v1/auth/login",
            new LoginRequest(email, Password),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.Unauthorized, login.StatusCode);
        var body = await login.Content.ReadAsStringAsync();
        Assert.Contains("not available", body, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("tenant_unresolved", body, StringComparison.Ordinal);
    }

    private async Task<HttpClient> PlatformClientAsync()
    {
        var client = Factory.CreateClient();
        var token = await IntegrationTestHelpers.LoginAsPlatformAdminAsync(client);
        IntegrationTestHelpers.UseBearerToken(client, token);
        return client;
    }

    private async Task<TenantResponse> CreateComplimentaryAsync(
        HttpClient platform,
        string slug,
        TenantPlan plan,
        string email)
    {
        using var response = await platform.PostAsJsonAsync(
            "/api/v1/platform/tenants",
            new CreateTenantRequest(slug, slug, plan.ToString(), email, IsComplimentary: true),
            IntegrationTestHelpers.JsonOptions);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TenantResponse>(IntegrationTestHelpers.JsonOptions)
            ?? throw new InvalidOperationException("Create tenant returned an empty body.");
    }

    private string ReadInviteToken(string email)
    {
        var sender = (FakeEmailSender)Factory.Services.GetRequiredService<IEmailSender>();
        var message = sender.Sent.Last(sent =>
            string.Equals(sent.ToEmail, email, StringComparison.OrdinalIgnoreCase)
            && sent.PlainTextBody.Contains("token=", StringComparison.Ordinal));
        var match = Regex.Match(message.PlainTextBody, @"token=([^&\s]+)");
        Assert.True(match.Success, "Invite email did not include a token.");
        return Uri.UnescapeDataString(match.Groups[1].Value);
    }

    [SkippableFact]
    public async Task InvitationCode_IsBoundToThatInvite()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var slugA = NewSlug();
        var emailA = $"a-{slugA}@example.com";
        var slugB = NewSlug();
        var emailB = $"b-{slugB}@example.com";
        using var platform = await PlatformClientAsync();
        var tenantA = await CreateComplimentaryAsync(platform, slugA, TenantPlan.Basic, emailA);
        var tenantB = await CreateComplimentaryAsync(platform, slugB, TenantPlan.Basic, emailB);
        using var bootA = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenantA.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest(emailA),
            IntegrationTestHelpers.JsonOptions);
        using var bootB = await platform.PostAsJsonAsync(
            $"/api/v1/platform/tenants/{tenantB.Id}/bootstrap-admin",
            new BootstrapFirstAdminRequest(emailB),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, bootA.StatusCode);
        Assert.Equal(HttpStatusCode.OK, bootB.StatusCode);

        using var client = Factory.CreateClient();
        var tokenB = ReadInviteToken(emailB);
        using var startB = await client.PostAsJsonAsync(
            "/api/v1/public/team/invites/activation",
            new StartInviteActivationRequest(tokenB, "Owner B"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, startB.StatusCode);
        using var startA = await client.PostAsJsonAsync(
            "/api/v1/public/team/invites/activation",
            new StartInviteActivationRequest(ReadInviteToken(emailA), "Owner A"),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, startA.StatusCode);

        using var crossed = await client.PostAsJsonAsync(
            "/api/v1/public/team/invites/activation/verify",
            new CompleteInviteActivationRequest(tokenB, Password, "Owner B", ReadInvitationCode(emailA)),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.BadRequest, crossed.StatusCode);

        await using var scope = Factory.Services.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        Assert.Null(await users.FindByEmailAsync(emailB));
        var db = scope.ServiceProvider.GetRequiredService<CohestraDbContext>();
        Assert.Equal(0, await db.IgnoreTenantFilters<TenantMembership>().CountAsync(row => row.TenantId == tenantB.Id));
    }

    private async Task<HttpResponseMessage> ActivateWithOtpAsync(
        HttpClient client,
        string token,
        string email,
        string nickname)
    {
        using var start = await client.PostAsJsonAsync(
            "/api/v1/public/team/invites/activation",
            new StartInviteActivationRequest(token, nickname),
            IntegrationTestHelpers.JsonOptions);
        Assert.Equal(HttpStatusCode.OK, start.StatusCode);
        var started = await start.Content.ReadFromJsonAsync<StartInviteActivationResponse>(
            IntegrationTestHelpers.JsonOptions);
        Assert.NotNull(started);
        Assert.True(started!.CodeSent);
        Assert.DoesNotContain(email, started.MaskedEmail, StringComparison.OrdinalIgnoreCase);

        return await client.PostAsJsonAsync(
            "/api/v1/public/team/invites/activation/verify",
            new CompleteInviteActivationRequest(token, Password, nickname, ReadInvitationCode(email)),
            IntegrationTestHelpers.JsonOptions);
    }

    private string ReadInvitationCode(string email)
    {
        var sender = (FakeEmailSender)Factory.Services.GetRequiredService<IEmailSender>();
        var message = sender.Sent.Last(sent =>
            string.Equals(sent.ToEmail, email, StringComparison.OrdinalIgnoreCase)
            && sent.PlainTextBody.Contains("invitation code is:", StringComparison.OrdinalIgnoreCase));
        var match = Regex.Match(message.PlainTextBody, @"invitation code is: (\d{6})", RegexOptions.IgnoreCase);
        Assert.True(match.Success, "Activation email did not include a code.");
        return match.Groups[1].Value;
    }

    private static string NewSlug() => "b" + Guid.NewGuid().ToString("N")[..12];
}
