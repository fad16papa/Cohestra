using Cohestra.Application.Tenants;
using Cohestra.Domain.Clients;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Registrations;

public sealed class ClientDeduplicationService(
    CohestraDbContext dbContext,
    ICurrentTenant currentTenant)
{
    public async Task<(Client Client, bool Created)> FindOrCreateAsync(
        ExtractedClientProfile profile,
        DateTimeOffset now,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenant.IsResolved || currentTenant.TenantId is null || currentTenant.TenantId == Guid.Empty)
        {
            throw new InvalidOperationException("Tenant context is required for client deduplication.");
        }

        var tenantId = currentTenant.TenantId.Value;
        Client? matchedByPhone = null;
        Client? matchedByEmail = null;

        if (!string.IsNullOrEmpty(profile.NormalizedPhone))
        {
            matchedByPhone = await dbContext.Clients
                .FirstOrDefaultAsync(
                    client =>
                        client.TenantId == tenantId &&
                        client.NormalizedPhone == profile.NormalizedPhone,
                    cancellationToken);
        }

        if (!string.IsNullOrEmpty(profile.NormalizedEmail))
        {
            matchedByEmail = await dbContext.Clients
                .FirstOrDefaultAsync(
                    client =>
                        client.TenantId == tenantId &&
                        client.NormalizedEmail == profile.NormalizedEmail,
                    cancellationToken);
        }

        if (matchedByPhone is not null)
        {
            var mergeSuspect = HasSplitContactMatch(matchedByPhone, matchedByEmail);
            mergeSuspect |= await ApplyProfileAsync(
                matchedByPhone,
                profile,
                now,
                ClientMatchKind.Phone,
                tenantId,
                cancellationToken);

            if (mergeSuspect)
            {
                matchedByPhone.IsMergeSuspect = true;
            }

            return (matchedByPhone, false);
        }

        if (matchedByEmail is not null)
        {
            var mergeSuspect = await ApplyProfileAsync(
                matchedByEmail,
                profile,
                now,
                ClientMatchKind.Email,
                tenantId,
                cancellationToken);

            if (mergeSuspect)
            {
                matchedByEmail.IsMergeSuspect = true;
            }

            return (matchedByEmail, false);
        }

        var created = new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = profile.DisplayName,
            Phone = profile.Phone,
            NormalizedPhone = profile.NormalizedPhone,
            Email = profile.Email,
            NormalizedEmail = profile.NormalizedEmail,
            Profession = profile.Profession,
            Nationality = profile.Nationality,
            Residency = profile.Residency,
            ConsentGiven = profile.ConsentGiven,
            ReferralSource = profile.ReferralSource,
            LeadStatus = LeadStatus.New,
            IsMergeSuspect = false,
            CreatedAt = now,
            UpdatedAt = now,
        };

        dbContext.Clients.Add(created);
        return (created, true);
    }

    private async Task<bool> ApplyProfileAsync(
        Client client,
        ExtractedClientProfile profile,
        DateTimeOffset now,
        ClientMatchKind matchKind,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var mergeSuspect = false;

        if (!string.IsNullOrWhiteSpace(profile.NameFromForm))
        {
            client.FullName = profile.NameFromForm.Trim();
        }

        if (!string.IsNullOrWhiteSpace(profile.Phone))
        {
            if (matchKind == ClientMatchKind.Phone)
            {
                client.Phone = profile.Phone;
                client.NormalizedPhone = profile.NormalizedPhone;
            }
            else if (HasPhoneConflict(client, profile) ||
                     await IsNormalizedPhoneOwnedByOtherClientAsync(
                         tenantId,
                         profile.NormalizedPhone!,
                         client.Id,
                         cancellationToken))
            {
                mergeSuspect = true;
            }
            else
            {
                client.Phone = profile.Phone;
                client.NormalizedPhone = profile.NormalizedPhone;
            }
        }

        if (!string.IsNullOrWhiteSpace(profile.Email))
        {
            if (HasEmailConflict(client, profile) ||
                await IsNormalizedEmailOwnedByOtherClientAsync(
                    tenantId,
                    profile.NormalizedEmail!,
                    client.Id,
                    cancellationToken))
            {
                mergeSuspect = true;
            }
            else
            {
                client.Email = profile.Email;
                client.NormalizedEmail = profile.NormalizedEmail;
            }
        }

        if (!string.IsNullOrWhiteSpace(profile.Profession))
        {
            client.Profession = profile.Profession;
        }

        if (!string.IsNullOrWhiteSpace(profile.Nationality))
        {
            client.Nationality = profile.Nationality;
        }

        if (!string.IsNullOrWhiteSpace(profile.Residency))
        {
            client.Residency = profile.Residency;
        }

        if (profile.ConsentGiven)
        {
            client.ConsentGiven = true;
        }

        if (!string.IsNullOrWhiteSpace(profile.ReferralSource))
        {
            client.ReferralSource = profile.ReferralSource;
        }

        client.UpdatedAt = now;
        return mergeSuspect;
    }

    internal static bool HasSplitContactMatch(Client matchedByPhone, Client? matchedByEmail) =>
        matchedByEmail is not null && matchedByPhone.Id != matchedByEmail.Id;

    internal static bool HasEmailConflict(Client client, ExtractedClientProfile profile) =>
        !string.IsNullOrEmpty(client.NormalizedEmail) &&
        !string.IsNullOrEmpty(profile.NormalizedEmail) &&
        !string.Equals(client.NormalizedEmail, profile.NormalizedEmail, StringComparison.Ordinal);

    internal static bool HasPhoneConflict(Client client, ExtractedClientProfile profile) =>
        !string.IsNullOrEmpty(client.NormalizedPhone) &&
        !string.IsNullOrEmpty(profile.NormalizedPhone) &&
        !string.Equals(client.NormalizedPhone, profile.NormalizedPhone, StringComparison.Ordinal);

    private async Task<bool> IsNormalizedEmailOwnedByOtherClientAsync(
        Guid tenantId,
        string normalizedEmail,
        Guid clientId,
        CancellationToken cancellationToken) =>
        await dbContext.Clients.AnyAsync(
            client =>
                client.TenantId == tenantId &&
                client.NormalizedEmail == normalizedEmail &&
                client.Id != clientId,
            cancellationToken);

    private async Task<bool> IsNormalizedPhoneOwnedByOtherClientAsync(
        Guid tenantId,
        string normalizedPhone,
        Guid clientId,
        CancellationToken cancellationToken) =>
        await dbContext.Clients.AnyAsync(
            client =>
                client.TenantId == tenantId &&
                client.NormalizedPhone == normalizedPhone &&
                client.Id != clientId,
            cancellationToken);

    private enum ClientMatchKind
    {
        Phone,
        Email,
    }
}
