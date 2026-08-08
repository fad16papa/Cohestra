using Cohestra.Application.Activities;
using Cohestra.Application.Outbox;
using Cohestra.Application.Registrations;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Outbox;
using Cohestra.Domain.Registrations;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;
using Cohestra.Infrastructure.Outbox;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenants;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Cohestra.Infrastructure.Registrations;

public sealed class RegistrationService(
    CohestraDbContext dbContext,
    IRegistrationIdempotencyStore idempotencyStore,
    ClientDeduplicationService clientDeduplicationService,
    RegistrationNumberGenerator registrationNumberGenerator,
    IOutboxPublisher outboxPublisher,
    IActivityService activityService,
    ICurrentTenant currentTenant,
    ILogger<RegistrationService> logger) : IRegistrationService
{
    public async Task<PublicRegistrationSubmitResult> SubmitPublicRegistrationAsync(
        string activitySlug,
        IReadOnlyDictionary<string, object?> answers,
        string? idempotencyKey = null,
        CancellationToken cancellationToken = default)
    {
        if (!currentTenant.IsResolved
            || currentTenant.TenantId is null
            || currentTenant.TenantId == Guid.Empty)
        {
            return PublicRegistrationSubmitResult.NotFound();
        }

        var tenantId = currentTenant.TenantId.Value;
        string? normalizedIdempotencyKey = null;
        string? requestFingerprint = null;

        if (!string.IsNullOrWhiteSpace(idempotencyKey))
        {
            try
            {
                normalizedIdempotencyKey = RedisRegistrationIdempotencyStore.NormalizeIdempotencyKey(idempotencyKey);
            }
            catch (ArgumentException ex)
            {
                return PublicRegistrationSubmitResult.Invalid(ex.Message);
            }

            requestFingerprint = RedisRegistrationIdempotencyStore.ComputeRequestFingerprint(
                activitySlug,
                answers);

            var lookup = await idempotencyStore.LookupAsync(
                tenantId,
                normalizedIdempotencyKey,
                requestFingerprint,
                cancellationToken);

            if (lookup.IsConflict)
            {
                return PublicRegistrationSubmitResult.IdempotencyConflict();
            }

            if (lookup.Cached is not null)
            {
                return PublicRegistrationSubmitResult.Created(
                    lookup.Cached.RegistrationId,
                    lookup.Cached.RegistrationNumber,
                    lookup.Cached.ClientId,
                    clientCreated: false,
                    isReplay: true);
            }

            if (!await idempotencyStore.TryBeginAsync(
                    tenantId,
                    normalizedIdempotencyKey,
                    requestFingerprint,
                    cancellationToken))
            {
                for (var attempt = 0; attempt < 5; attempt++)
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(100 * (attempt + 1)), cancellationToken);

                    lookup = await idempotencyStore.LookupAsync(
                        tenantId,
                        normalizedIdempotencyKey,
                        requestFingerprint,
                        cancellationToken);

                    if (lookup.IsConflict)
                    {
                        return PublicRegistrationSubmitResult.IdempotencyConflict();
                    }

                    if (lookup.Cached is not null)
                    {
                        return PublicRegistrationSubmitResult.Created(
                            lookup.Cached.RegistrationId,
                            lookup.Cached.RegistrationNumber,
                            lookup.Cached.ClientId,
                            clientCreated: false,
                            isReplay: true);
                    }
                }

                return PublicRegistrationSubmitResult.Invalid(
                    "A registration with this Idempotency-Key is already in progress. Retry shortly.");
            }
        }

        try
        {
            var result = await SubmitCoreAsync(activitySlug, answers, tenantId, cancellationToken);

            if (result.IsSuccess &&
                normalizedIdempotencyKey is not null &&
                requestFingerprint is not null)
            {
                await StoreIdempotencyResultWithRetryAsync(
                    tenantId,
                    normalizedIdempotencyKey,
                    requestFingerprint,
                    result.RegistrationId,
                    result.RegistrationNumber,
                    result.ClientId,
                    cancellationToken);
            }

            return result;
        }
        finally
        {
            if (normalizedIdempotencyKey is not null)
            {
                await idempotencyStore.ReleaseLockAsync(tenantId, normalizedIdempotencyKey, cancellationToken);
            }
        }
    }

    private async Task StoreIdempotencyResultWithRetryAsync(
        Guid tenantId,
        string idempotencyKey,
        string requestFingerprint,
        Guid registrationId,
        string registrationNumber,
        Guid clientId,
        CancellationToken cancellationToken)
    {
        const int maxAttempts = 3;
        var registration = new IdempotencyCachedRegistration(
            registrationId,
            registrationNumber,
            clientId);

        for (var attempt = 0; attempt < maxAttempts; attempt++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            try
            {
                await idempotencyStore.StoreAsync(
                    tenantId,
                    idempotencyKey,
                    requestFingerprint,
                    registration,
                    cancellationToken);
                return;
            }
            catch when (attempt < maxAttempts - 1)
            {
                await Task.Delay(TimeSpan.FromMilliseconds(50 * (attempt + 1)), cancellationToken);
            }
        }
    }

    private async Task<PublicRegistrationSubmitResult> SubmitCoreAsync(
        string activitySlug,
        IReadOnlyDictionary<string, object?> answers,
        Guid tenantId,
        CancellationToken cancellationToken)
    {
        var normalizedSlug = activitySlug.Trim();

        var activity = await dbContext.Activities
            .FirstOrDefaultAsync(
                item => item.Slug == normalizedSlug
                    && item.TenantId == tenantId
                    && item.Status == ActivityStatus.Published,
                cancellationToken);

        if (activity is null)
        {
            return PublicRegistrationSubmitResult.NotFound();
        }

        var validationError = RegistrationAnswerValidator.Validate(activity.FormSchema, answers);
        if (validationError is not null)
        {
            return PublicRegistrationSubmitResult.Invalid(validationError);
        }

        var normalizedAnswers = RegistrationAnswerValidator.NormalizeAnswers(
            activity.FormSchema!,
            answers);
        var profile = ClientProfileExtractor.Extract(activity.FormSchema!, normalizedAnswers);
        var now = DateTimeOffset.UtcNow;

        var (client, clientCreated) = await clientDeduplicationService.FindOrCreateAsync(
            profile,
            now,
            cancellationToken);

        var existingRegistration = await dbContext.Registrations
            .AsNoTracking()
            .FirstOrDefaultAsync(
                registration =>
                    registration.ClientId == client.Id &&
                    registration.ActivityId == activity.Id,
                cancellationToken);

        if (existingRegistration is not null)
        {
            return PublicRegistrationSubmitResult.AlreadyRegistered(
                existingRegistration.Id,
                existingRegistration.RegistrationNumber,
                client.Id);
        }

        await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);

        await dbContext.Database.ExecuteSqlInterpolatedAsync(
            $"""SELECT "Id" FROM public.activities WHERE "Id" = {activity.Id} FOR UPDATE""",
            cancellationToken);

        var lockedActivity = await dbContext.Activities
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == activity.Id, cancellationToken);

        if (lockedActivity is null || lockedActivity.Status != ActivityStatus.Published)
        {
            await transaction.RollbackAsync(cancellationToken);
            return PublicRegistrationSubmitResult.NotFound();
        }

        var registrationCount = await dbContext.Registrations
            .CountAsync(registration => registration.ActivityId == activity.Id, cancellationToken);

        if (ActivityCapacityValidator.IsRegistrationFull(lockedActivity.MaxRegistrants, registrationCount))
        {
            await transaction.RollbackAsync(cancellationToken);
            await RefreshPublicActivityCacheBestEffortAsync(tenantId, normalizedSlug, cancellationToken);
            return PublicRegistrationSubmitResult.ActivityFull();
        }

        var tenant = await dbContext.Tenants
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == tenantId, cancellationToken);

        if (tenant is not null)
        {
            var limits = TenantPlanLimits.For(tenant.Plan);
            var monthStart = RegistrationPeriod.GetMonthStartUtc(now, tenant.RegistrationTimeZoneId);
            var registrationsThisMonth = await dbContext.Registrations
                .CountAsync(
                    item => item.TenantId == tenantId && item.CreatedAt >= monthStart,
                    cancellationToken);
            var planLimitError = TenantPlanLimitValidator.ValidateCanAcceptRegistration(
                registrationsThisMonth,
                limits.RegistrationsPerMonth);
            if (planLimitError is not null)
            {
                await transaction.RollbackAsync(cancellationToken);
                return PublicRegistrationSubmitResult.PlanRegistrationLimitReached(planLimitError);
            }
        }

        var registrationNumber = await registrationNumberGenerator.GenerateNextAsync(now, cancellationToken);

        var registration = new Registration
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            RegistrationNumber = registrationNumber,
            ActivityId = activity.Id,
            ClientId = client.Id,
            Answers = normalizedAnswers,
            CreatedAt = now,
        };

        dbContext.Registrations.Add(registration);

        if (profile.Email is not null && !string.IsNullOrWhiteSpace(profile.Email.Trim()))
        {
            var payload = JsonSerializer.Serialize(new RegistrationConfirmationOutboxPayload(registration.Id));
            outboxPublisher.Enqueue(
                tenantId,
                OutboxMessageTypes.RegistrationConfirmation,
                payload,
                $"registration:{registration.Id}:confirmation");
        }

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync(cancellationToken);

            var duplicateRegistration = await dbContext.Registrations
                .AsNoTracking()
                .FirstOrDefaultAsync(
                    item =>
                        item.ClientId == client.Id &&
                        item.ActivityId == activity.Id,
                    cancellationToken);

            if (duplicateRegistration is not null)
            {
                return PublicRegistrationSubmitResult.AlreadyRegistered(
                    duplicateRegistration.Id,
                    duplicateRegistration.RegistrationNumber,
                    client.Id);
            }

            throw;
        }

        await RefreshPublicActivityCacheBestEffortAsync(tenantId, normalizedSlug, cancellationToken);

        return PublicRegistrationSubmitResult.Created(
            registration.Id,
            registration.RegistrationNumber,
            client.Id,
            clientCreated,
            confirmationEmailQueued: profile.Email is not null && !string.IsNullOrWhiteSpace(profile.Email.Trim()),
            confirmationEmail: profile.Email?.Trim());
    }

    private async Task RefreshPublicActivityCacheBestEffortAsync(
        Guid tenantId,
        string activitySlug,
        CancellationToken cancellationToken)
    {
        try
        {
            await activityService.RefreshPublicActivityCacheBySlugAsync(
                tenantId,
                activitySlug,
                cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(
                ex,
                "Public activity cache refresh failed for slug {ActivitySlug}.",
                activitySlug);
        }
    }
}
