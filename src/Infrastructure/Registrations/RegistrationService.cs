using Cohestra.Application.Registrations;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Activities;
using Cohestra.Domain.Registrations;
using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Cohestra.Infrastructure.Registrations;

public sealed class RegistrationService(
    CohestraDbContext dbContext,
    IRegistrationIdempotencyStore idempotencyStore,
    ClientDeduplicationService clientDeduplicationService,
    RegistrationNumberGenerator registrationNumberGenerator,
    IRegistrationNotificationService registrationNotificationService,
    ICurrentTenant currentTenant,
    ILogger<RegistrationService> logger) : IRegistrationService
{
    public async Task<PublicRegistrationSubmitResult> SubmitPublicRegistrationAsync(
        string activitySlug,
        IReadOnlyDictionary<string, object?> answers,
        string? idempotencyKey = null,
        CancellationToken cancellationToken = default)
    {
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
                    normalizedIdempotencyKey,
                    requestFingerprint,
                    cancellationToken))
            {
                for (var attempt = 0; attempt < 5; attempt++)
                {
                    await Task.Delay(TimeSpan.FromMilliseconds(100 * (attempt + 1)), cancellationToken);

                    lookup = await idempotencyStore.LookupAsync(
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
            var result = await SubmitCoreAsync(activitySlug, answers, cancellationToken);

            if (result.IsSuccess && !result.IsReplay)
            {
                try
                {
                    var confirmation = await registrationNotificationService.SendConfirmationIfApplicableAsync(
                        result.RegistrationId,
                        cancellationToken);

                    result = result with
                    {
                        ConfirmationEmailSent = confirmation.Sent,
                        ConfirmationEmail = confirmation.RecipientEmail,
                    };
                }
                catch (Exception ex) when (ex is not OperationCanceledException)
                {
                    logger.LogWarning(
                        ex,
                        "Registration confirmation email failed after save for {RegistrationId}.",
                        result.RegistrationId);
                }
            }

            if (result.IsSuccess &&
                normalizedIdempotencyKey is not null &&
                requestFingerprint is not null)
            {
                await StoreIdempotencyResultWithRetryAsync(
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
                await idempotencyStore.ReleaseLockAsync(normalizedIdempotencyKey, cancellationToken);
            }
        }
    }

    private async Task StoreIdempotencyResultWithRetryAsync(
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
        CancellationToken cancellationToken)
    {
        var normalizedSlug = activitySlug.Trim();

        if (!currentTenant.IsResolved || currentTenant.TenantId is null)
        {
            return PublicRegistrationSubmitResult.NotFound();
        }

        var tenantId = currentTenant.TenantId.Value;

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

        var registrationNumber = await registrationNumberGenerator.GenerateNextAsync(now, cancellationToken);

        var registration = new Registration
        {
            Id = Guid.NewGuid(),
            RegistrationNumber = registrationNumber,
            ActivityId = activity.Id,
            ClientId = client.Id,
            Answers = normalizedAnswers,
            CreatedAt = now,
        };

        dbContext.Registrations.Add(registration);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
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

        return PublicRegistrationSubmitResult.Created(
            registration.Id,
            registration.RegistrationNumber,
            client.Id,
            clientCreated);
    }
}
