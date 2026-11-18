using Cohestra.Application.Auth;
using Cohestra.Application.Email;
using Cohestra.Application.Team;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Team;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Team;

public sealed class TeamInviteServiceTests
{
    [Fact]
    public void HashToken_IsDeterministic()
    {
        var a = TeamInviteService.HashToken("test-token");
        var b = TeamInviteService.HashToken("test-token");
        Assert.Equal(a, b);
        Assert.NotEqual(TeamInviteService.HashToken("other"), a);
    }

    [Fact]
    public void GenerateToken_ProducesDistinctValues()
    {
        var a = TeamInviteService.GenerateToken();
        var b = TeamInviteService.GenerateToken();
        Assert.NotEqual(a, b);
        Assert.True(a.Length >= 32);
    }

    [Fact]
    public void TenantInvite_IsPending_respects_revoke_expiry_accept()
    {
        var now = DateTimeOffset.UtcNow;
        var invite = new TenantInvite
        {
            ExpiresAt = now.AddDays(1),
        };

        Assert.True(invite.IsPending(now));

        invite.RevokedAt = now;
        Assert.False(invite.IsPending(now));

        invite.RevokedAt = null;
        invite.AcceptedAt = now;
        Assert.False(invite.IsPending(now));

        invite.AcceptedAt = null;
        invite.ExpiresAt = now.AddMinutes(-1);
        Assert.False(invite.IsPending(now));
    }

    [Fact]
    public async Task RemoveMember_Self_ReturnsValidation()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        var adminId = Guid.NewGuid();
        SeedMembership(db, tenantId, adminId, TenantMembershipRole.TenantAdmin);
        await db.SaveChangesAsync();

        var result = await CreateService(db).RemoveMemberAsync(tenantId, adminId, adminId);

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.Validation, result.Error);
        Assert.Contains("cannot remove yourself", result.Detail, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, await db.TenantMemberships.CountAsync());
    }

    [Fact]
    public async Task RemoveMember_LastAdmin_ReturnsConflict()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        var lastAdmin = Guid.NewGuid();
        var outsider = Guid.NewGuid();
        SeedMembership(db, tenantId, lastAdmin, TenantMembershipRole.TenantAdmin);
        await db.SaveChangesAsync();

        var result = await CreateService(db).RemoveMemberAsync(tenantId, outsider, lastAdmin);

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.Conflict, result.Error);
        Assert.Contains("last workspace admin", result.Detail, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(1, await db.TenantMemberships.CountAsync());
    }

    [Fact]
    public void ActiveMembersFillSeatCap_BasicSingleSeat_IsFullAtOneMember()
    {
        Assert.False(TeamInviteService.ActiveMembersFillSeatCap(0, 1));
        Assert.True(TeamInviteService.ActiveMembersFillSeatCap(1, 1));
    }

    [Fact]
    public async Task CreateInvite_BasicPlan_StaysPlanLocked()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(NewTenant(tenantId, TenantPlan.Basic, complimentary: true));
        await db.SaveChangesAsync();

        var result = await CreateService(db).CreateInviteAsync(
            tenantId,
            Guid.NewGuid(),
            "second@example.com",
            TenantMembershipRole.TenantMember,
            "https://example.test/invite/accept");

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.PlanLocked, result.Error);
    }

    [Fact]
    public async Task Bootstrap_NonComplimentary_ReturnsConflict()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(NewTenant(tenantId, TenantPlan.Basic, complimentary: false));
        await db.SaveChangesAsync();

        var (result, value) = await CreateService(db).BootstrapFirstAdminAsync(
            tenantId,
            Guid.NewGuid(),
            "owner@example.com",
            "https://example.test/invite/accept");

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.Conflict, result.Error);
        Assert.Null(value);
        Assert.Equal(0, await db.TenantInvites.CountAsync());
    }

    [Fact]
    public async Task Bootstrap_Suspended_ReturnsConflict()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        var tenant = NewTenant(tenantId, TenantPlan.Basic, complimentary: true);
        tenant.Status = TenantStatus.Suspended;
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();

        var (result, _) = await CreateService(db).BootstrapFirstAdminAsync(
            tenantId,
            Guid.NewGuid(),
            "owner@example.com",
            "https://example.test/invite/accept");

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.Conflict, result.Error);
    }

    [Fact]
    public async Task Bootstrap_WhenMemberExists_ReturnsConflict()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(NewTenant(tenantId, TenantPlan.Core, complimentary: true));
        SeedMembership(db, tenantId, Guid.NewGuid(), TenantMembershipRole.TenantAdmin);
        await db.SaveChangesAsync();

        var (result, _) = await CreateService(db).BootstrapFirstAdminAsync(
            tenantId,
            Guid.NewGuid(),
            "owner@example.com",
            "https://example.test/invite/accept");

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.Conflict, result.Error);
    }

    [Fact]
    public async Task RemoveMember_OtherAdminWhenActorAlsoAdmin_Succeeds()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        var actor = Guid.NewGuid();
        var otherAdmin = Guid.NewGuid();
        SeedMembership(db, tenantId, actor, TenantMembershipRole.TenantAdmin);
        SeedMembership(db, tenantId, otherAdmin, TenantMembershipRole.TenantAdmin);
        await db.SaveChangesAsync();

        var result = await CreateService(db).RemoveMemberAsync(tenantId, actor, otherAdmin);

        Assert.True(result.Succeeded);
        Assert.Equal(1, await db.TenantMemberships.CountAsync());
        Assert.Equal(actor, Assert.Single(db.TenantMemberships).UserId);
    }

    private static Tenant NewTenant(Guid tenantId, TenantPlan plan, bool complimentary)
    {
        var now = DateTimeOffset.UtcNow;
        return new Tenant
        {
            Id = tenantId,
            Slug = "ws-" + tenantId.ToString("N")[..12],
            Name = "Workspace",
            Plan = plan,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            IsComplimentary = complimentary,
            AdminContactEmail = "contact@example.com",
            CreatedAt = now,
            UpdatedAt = now,
        };
    }

    private static void SeedMembership(
        CohestraDbContext db,
        Guid tenantId,
        Guid userId,
        TenantMembershipRole role)
    {
        db.TenantMemberships.Add(new TenantMembership
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            UserId = userId,
            Role = role,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        });
    }

    [Fact]
    public async Task Accept_FirstAdminInvite_DoesNotCreateMembership()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(NewTenant(tenantId, TenantPlan.Basic, complimentary: true));
        var token = TeamInviteService.GenerateToken();
        db.TenantInvites.Add(PendingInvite(tenantId, "owner@example.com", token, requiresOtp: true));
        await db.SaveChangesAsync();

        var (result, value) = await CreateService(db).AcceptInviteAsync(
            new AcceptInviteCommand(token, "ChangeMe123!", "Owner"));

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.ActivationOtpRequired, result.Error);
        Assert.Null(value);
        Assert.Equal(0, await db.TenantMemberships.CountAsync());
        Assert.Null(Assert.Single(db.IgnoreTenantFilters<TenantInvite>()).AcceptedAt);
    }

    [Fact]
    public async Task StartActivation_SendsCodeToStoredInviteEmailOnly()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(NewTenant(tenantId, TenantPlan.Basic, complimentary: true));
        var token = TeamInviteService.GenerateToken();
        db.TenantInvites.Add(PendingInvite(tenantId, "owner@example.com", token, requiresOtp: true));
        await db.SaveChangesAsync();
        var email = new RecordingEmailSender();
        var otp = new RecordingOtpStore();

        var (result, value) = await CreateService(db, email, otp).StartInviteActivationAsync(
            new StartInviteActivationCommand(token, "Beta Owner"));

        Assert.True(result.Succeeded);
        Assert.NotNull(value);
        Assert.True(value!.CodeSent);
        Assert.Equal("o***@example.com", value.MaskedEmail);
        Assert.DoesNotContain("owner@", value.MaskedEmail, StringComparison.Ordinal);
        Assert.Equal("owner@example.com", email.LastTo);
        Assert.Contains("invitation code is:", email.LastPlainText, StringComparison.OrdinalIgnoreCase);
        Assert.Equal(OtpPurpose.InviteActivation, otp.StoredPurpose);
        Assert.Equal("owner@example.com", otp.StoredEmail);
        Assert.Contains(db.IgnoreTenantFilters<TenantInvite>().Single().Id.ToString("D"), otp.StoredScope);
        Assert.Equal(0, await db.TenantMemberships.CountAsync());
    }

    [Fact]
    public async Task StartActivation_EmailFailure_RemovesCodeAndCreatesNothing()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(NewTenant(tenantId, TenantPlan.Basic, complimentary: true));
        var token = TeamInviteService.GenerateToken();
        db.TenantInvites.Add(PendingInvite(tenantId, "owner@example.com", token, requiresOtp: true));
        await db.SaveChangesAsync();
        var otp = new RecordingOtpStore();

        var (result, value) = await CreateService(db, new RecordingEmailSender { Succeed = false }, otp)
            .StartInviteActivationAsync(new StartInviteActivationCommand(token, "Beta Owner"));

        Assert.False(result.Succeeded);
        Assert.Null(value);
        Assert.True(otp.Removed);
        Assert.Equal(0, await db.TenantMemberships.CountAsync());
        Assert.Null(Assert.Single(db.IgnoreTenantFilters<TenantInvite>()).AcceptedAt);
    }

    [Fact]
    public async Task CompleteActivation_WrongCode_CreatesNothing()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(NewTenant(tenantId, TenantPlan.Basic, complimentary: true));
        var token = TeamInviteService.GenerateToken();
        db.TenantInvites.Add(PendingInvite(tenantId, "owner@example.com", token, requiresOtp: true));
        await db.SaveChangesAsync();

        var (result, value) = await CreateService(db).CompleteInviteActivationAsync(
            new CompleteInviteActivationCommand(token, "ChangeMe123!", "Beta Owner", "000000"));

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.Validation, result.Error);
        Assert.Null(value);
        Assert.Equal(0, await db.TenantMemberships.CountAsync());
    }

    [Fact]
    public async Task CompleteActivation_WeakPassword_DoesNotConsumeCode()
    {
        await using var db = CreateDb();
        var tenantId = Guid.NewGuid();
        db.Tenants.Add(NewTenant(tenantId, TenantPlan.Basic, complimentary: true));
        var token = TeamInviteService.GenerateToken();
        db.TenantInvites.Add(PendingInvite(tenantId, "owner@example.com", token, requiresOtp: true));
        await db.SaveChangesAsync();
        var otp = new RecordingOtpStore();

        var (result, value) = await CreateService(db, otp: otp).CompleteInviteActivationAsync(
            new CompleteInviteActivationCommand(token, "longenough", "Beta Owner", "123456"));

        Assert.False(result.Succeeded);
        Assert.Equal(TeamInviteError.Validation, result.Error);
        Assert.Null(value);
        Assert.Equal(0, otp.ValidateCalls);
        Assert.Equal(0, await db.TenantMemberships.CountAsync());
    }

    [Fact]
    public void MaskEmail_HidesTheLocalPart()
    {
        Assert.Equal("o***@example.com", TeamInviteService.MaskEmail("owner@example.com"));
        Assert.DoesNotContain("owner", TeamInviteService.MaskEmail("owner@example.com"), StringComparison.Ordinal);
    }

    private static TenantInvite PendingInvite(Guid tenantId, string email, string token, bool requiresOtp) =>
        new()
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            Email = email,
            Role = TenantMembershipRole.TenantAdmin,
            TokenHash = TeamInviteService.HashToken(token),
            InvitedByUserId = Guid.NewGuid(),
            ExpiresAt = DateTimeOffset.UtcNow.AddDays(1),
            CreatedAt = DateTimeOffset.UtcNow,
            RequiresActivationOtp = requiresOtp,
        };

    private static TeamInviteService CreateService(
        CohestraDbContext db,
        RecordingEmailSender? email = null,
        RecordingOtpStore? otp = null) =>
        new(
            db,
            userManager: null!,
            membershipService: null!,
            emailSender: email ?? new RecordingEmailSender(),
            sendGridOptions: Options.Create(new Cohestra.Infrastructure.Email.SendGridSettings()),
            logger: NullLogger<TeamInviteService>.Instance,
            otpStore: otp ?? new RecordingOtpStore(),
            otpOptions: Options.Create(new AuthOtpSettings()));

    private sealed class RecordingEmailSender : IEmailSender
    {
        public bool Succeed { get; init; } = true;
        public string? LastTo { get; private set; }
        public string? LastPlainText { get; private set; }

        public Task<EmailSendResult> SendAsync(EmailMessage message, CancellationToken cancellationToken = default)
        {
            LastTo = message.ToEmail;
            LastPlainText = message.PlainTextBody;
            return Task.FromResult(new EmailSendResult(Succeed, Succeed ? "test" : null, Succeed ? null : "down"));
        }
    }

    private sealed class RecordingOtpStore : IAuthOtpStore
    {
        private string? _code;
        private string? _scope;
        public string? StoredEmail { get; private set; }
        public OtpPurpose StoredPurpose { get; private set; }
        public string? StoredScope => _scope;
        public bool Removed { get; private set; }
        public int ValidateCalls { get; private set; }

        public Task<bool> TryStoreAsync(
            string email,
            OtpPurpose purpose,
            string code,
            TimeSpan ttl,
            CancellationToken cancellationToken = default,
            string? bindingScope = null)
        {
            StoredEmail = email;
            StoredPurpose = purpose;
            _code = code;
            _scope = bindingScope;
            Removed = false;
            return Task.FromResult(true);
        }

        public Task<bool> ValidateAndConsumeAsync(
            string email,
            OtpPurpose purpose,
            string code,
            CancellationToken cancellationToken = default,
            string? bindingScope = null)
        {
            ValidateCalls++;
            var match = _code is not null
                && string.Equals(email, StoredEmail, StringComparison.OrdinalIgnoreCase)
                && purpose == StoredPurpose
                && bindingScope == _scope
                && code == _code;
            if (match)
            {
                _code = null;
            }

            return Task.FromResult(match);
        }

        public Task<bool> TryRecordSendAttemptAsync(
            string email,
            OtpPurpose purpose,
            int maxAttempts,
            TimeSpan window,
            CancellationToken cancellationToken = default,
            string? bindingScope = null) =>
            Task.FromResult(true);

        public Task RemoveAsync(
            string email,
            OtpPurpose purpose,
            CancellationToken cancellationToken = default,
            string? bindingScope = null)
        {
            Removed = true;
            _code = null;
            return Task.CompletedTask;
        }

        public Task<bool> TryRecordFailedVerificationAsync(
            string email,
            OtpPurpose purpose,
            int maxFailures,
            CancellationToken cancellationToken = default,
            string? bindingScope = null) =>
            Task.FromResult(true);
    }

    private static CohestraDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CohestraDbContext(options);
    }
}
