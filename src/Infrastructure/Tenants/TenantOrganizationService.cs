using Cohestra.Application.Tenants;
using Cohestra.Contracts.Admin;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenants;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Tenants;

public sealed class TenantOrganizationService(CohestraDbContext dbContext) : ITenantOrganizationService
{
    public async Task<TenantRegistrationTimeZoneResponse> GetRegistrationTimeZoneAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        return BuildResponse(tenant.RegistrationTimeZoneId);
    }

    public async Task<(bool Ok, string? Error)> UpdateRegistrationTimeZoneAsync(
        Guid tenantId,
        string registrationTimeZoneId,
        CancellationToken cancellationToken = default)
    {
        var validationError = RegistrationTimeZoneSupport.Validate(registrationTimeZoneId);
        if (validationError is not null)
        {
            return (false, validationError);
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return (false, "Tenant not found.");
        }

        tenant.RegistrationTimeZoneId = RegistrationTimeZoneSupport.Normalize(registrationTimeZoneId);
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return (true, null);
    }

    public async Task<TenantEmbedSettingsResponse> GetEmbedSettingsAsync(
        Guid tenantId,
        CancellationToken cancellationToken = default)
    {
        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken)
            ?? throw new InvalidOperationException("Tenant not found.");

        return new TenantEmbedSettingsResponse(tenant.AllowedEmbedOrigins);
    }

    public async Task<(bool Ok, string? Error)> UpdateEmbedSettingsAsync(
        Guid tenantId,
        IReadOnlyList<string> allowedEmbedOrigins,
        CancellationToken cancellationToken = default)
    {
        var (ok, normalized, error) = EmbedOriginSupport.NormalizeList(allowedEmbedOrigins);
        if (!ok)
        {
            return (false, error);
        }

        var tenant = await dbContext.Tenants
            .FirstOrDefaultAsync(t => t.Id == tenantId, cancellationToken);
        if (tenant is null)
        {
            return (false, "Tenant not found.");
        }

        tenant.AllowedEmbedOrigins = normalized.ToList();
        tenant.UpdatedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);
        return (true, null);
    }

    internal static TenantRegistrationTimeZoneResponse BuildResponse(string? registrationTimeZoneId)
    {
        var normalized = RegistrationTimeZoneSupport.Normalize(registrationTimeZoneId);
        var now = DateTimeOffset.UtcNow;
        var nextReset = RegistrationPeriod.GetNextMonthStartUtc(now, normalized);
        return new TenantRegistrationTimeZoneResponse(
            normalized,
            RegistrationTimeZoneSupport.GetDisplayLabel(normalized),
            nextReset,
            RegistrationTimeZoneSupport.CommonChoices()
                .Select(choice => new RegistrationTimeZoneOption(choice.Id, choice.Label))
                .ToList());
    }
}
