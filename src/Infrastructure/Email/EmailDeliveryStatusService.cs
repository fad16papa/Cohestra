using System.Text.Json;
using LeadGenerationCrm.Application.Email;
using LeadGenerationCrm.Contracts.Email;
using LeadGenerationCrm.Infrastructure.Email;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SendGrid;

namespace LeadGenerationCrm.Infrastructure.Email;

public sealed class EmailDeliveryStatusService(
    IOptions<SendGridSettings> options,
    ILogger<EmailDeliveryStatusService> logger) : IEmailDeliveryStatusService
{
    public async Task<EmailDeliveryStatusResponse> GetStatusAsync(
        CancellationToken cancellationToken = default)
    {
        var settings = options.Value;
        var apiKeyConfigured = !string.IsNullOrWhiteSpace(settings.ApiKey);
        var fromEmail = settings.FromEmail?.Trim() ?? string.Empty;
        var fromName = settings.FromName?.Trim() ?? string.Empty;
        var fromEmailConfigured = !string.IsNullOrWhiteSpace(fromEmail);

        var checklist = new List<EmailDeliveryChecklistItemResponse>
        {
            BuildApiKeyItem(apiKeyConfigured),
            BuildFromEmailItem(fromEmailConfigured, fromEmail),
            BuildSandboxItem(settings.UseSandbox),
        };

        if (apiKeyConfigured && fromEmailConfigured && !settings.UseSandbox)
        {
            await AppendSendGridVerificationItemsAsync(
                settings.ApiKey!.Trim(),
                fromEmail,
                checklist,
                cancellationToken);

            await ValidateApiKeyWithSendGridAsync(
                settings.ApiKey!.Trim(),
                checklist,
                cancellationToken);
        }
        else if (apiKeyConfigured && fromEmailConfigured)
        {
            checklist.Add(BuildDomainAuthenticationItem(SendGridLookupResult.Unavailable(), fromEmail));
            checklist.Add(BuildSenderVerificationItem(SendGridLookupResult.Unavailable(), fromEmail));
        }

        var isReady = checklist.All(item =>
            item.Status is "complete" or "info");

        return new EmailDeliveryStatusResponse(
            isReady,
            apiKeyConfigured,
            settings.UseSandbox,
            fromEmail,
            fromName,
            checklist);
    }

    private static async Task ValidateApiKeyWithSendGridAsync(
        string apiKey,
        List<EmailDeliveryChecklistItemResponse> checklist,
        CancellationToken cancellationToken)
    {
        var client = new SendGridClient(apiKey);
        var response = await client.RequestAsync(
            method: BaseClient.Method.GET,
            urlPath: "scopes",
            cancellationToken: cancellationToken);

        if ((int)response.StatusCode is not 401)
        {
            return;
        }

        var apiKeyIndex = checklist.FindIndex(item => item.Id == "sendgrid-api-key");
        if (apiKeyIndex < 0)
        {
            return;
        }

        checklist[apiKeyIndex] = new EmailDeliveryChecklistItemResponse(
            "sendgrid-api-key",
            "SendGrid API key",
            "SendGrid rejected the configured API key (HTTP 401). Campaign sends will fail until this is fixed.",
            "action_required",
            "Create a new API key in SendGrid (Settings → API Keys → Create API Key → Full Access), copy the secret shown once, replace SendGrid__ApiKey in .env, then run: docker compose up -d --force-recreate api. Editing an existing key's permissions does not update .env.");
    }

    private async Task AppendSendGridVerificationItemsAsync(
        string apiKey,
        string fromEmail,
        List<EmailDeliveryChecklistItemResponse> checklist,
        CancellationToken cancellationToken)
    {
        try
        {
            var client = new SendGridClient(apiKey);
            var domain = ExtractEmailDomain(fromEmail);

            var domainResult = domain is null || IsFreemailDomain(domain)
                ? SendGridLookupResult.NotApplicable()
                : await TryResolveDomainAuthenticationAsync(client, domain, cancellationToken);

            checklist.Add(BuildDomainAuthenticationItem(domainResult, fromEmail));

            var senderResult = await TryResolveSenderVerificationAsync(
                client,
                fromEmail,
                domainResult,
                cancellationToken);
            checklist.Add(BuildSenderVerificationItem(senderResult, fromEmail));
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex, "Could not load SendGrid delivery verification status.");

            checklist.Add(BuildSenderVerificationItem(SendGridLookupResult.Unavailable(), fromEmail));
            checklist.Add(BuildDomainAuthenticationItem(SendGridLookupResult.Unavailable(), fromEmail));
        }
    }

    private static async Task<SendGridLookupResult> TryResolveSenderVerificationAsync(
        SendGridClient client,
        string fromEmail,
        SendGridLookupResult domainResult,
        CancellationToken cancellationToken)
    {
        if (domainResult.State == SendGridLookupState.Verified)
        {
            return SendGridLookupResult.Verified(
                "Domain authentication covers this From address.");
        }

        var response = await client.RequestAsync(
            method: BaseClient.Method.GET,
            urlPath: "verified_senders",
            cancellationToken: cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            return SendGridLookupResult.Unavailable((int)response.StatusCode);
        }

        var body = await response.Body.ReadAsStringAsync(cancellationToken);
        return SendGridDeliveryStatusParser.IsSenderVerified(body, fromEmail)
            ? SendGridLookupResult.Verified()
            : SendGridLookupResult.NotVerified();
    }

    private static async Task<SendGridLookupResult> TryResolveDomainAuthenticationAsync(
        SendGridClient client,
        string domain,
        CancellationToken cancellationToken)
    {
        var response = await client.RequestAsync(
            method: BaseClient.Method.GET,
            urlPath: $"whitelabel/domains?domain={Uri.EscapeDataString(domain)}",
            cancellationToken: cancellationToken);

        if (response.IsSuccessStatusCode)
        {
            var body = await response.Body.ReadAsStringAsync(cancellationToken);
            if (SendGridDeliveryStatusParser.TryGetDomainAuthenticationState(body, domain, out var state))
            {
                return state;
            }
        }
        else if ((int)response.StatusCode is not 404)
        {
            return SendGridLookupResult.Unavailable((int)response.StatusCode);
        }

        var defaultResponse = await client.RequestAsync(
            method: BaseClient.Method.GET,
            urlPath: "whitelabel/domains/default",
            cancellationToken: cancellationToken);

        if (!defaultResponse.IsSuccessStatusCode)
        {
            return SendGridLookupResult.Unavailable((int)defaultResponse.StatusCode);
        }

        var defaultBody = await defaultResponse.Body.ReadAsStringAsync(cancellationToken);
        return SendGridDeliveryStatusParser.TryGetDomainAuthenticationState(defaultBody, domain, out var defaultState)
            ? defaultState
            : SendGridLookupResult.NotVerified();
    }

    internal static EmailDeliveryChecklistItemResponse BuildApiKeyItem(bool apiKeyConfigured) =>
        new(
            "sendgrid-api-key",
            "SendGrid API key",
            apiKeyConfigured
                ? "The server has a SendGrid API key configured."
                : "No SendGrid API key is configured on the server.",
            apiKeyConfigured ? "complete" : "action_required",
            apiKeyConfigured
                ? null
                : "Add SendGrid:ApiKey to the API environment (Docker Compose or hosting secrets). Never commit keys to git.");

    internal static EmailDeliveryChecklistItemResponse BuildFromEmailItem(
        bool fromEmailConfigured,
        string fromEmail) =>
        new(
            "sender-email",
            "Sender email address",
            fromEmailConfigured
                ? $"Campaigns send from {fromEmail}."
                : "No sender email is configured for outbound campaigns.",
            fromEmailConfigured ? "complete" : "action_required",
            fromEmailConfigured
                ? null
                : "Set SendGrid:FromEmail to the address you will verify in SendGrid.");

    internal static EmailDeliveryChecklistItemResponse BuildSandboxItem(bool useSandbox) =>
        useSandbox
            ? new EmailDeliveryChecklistItemResponse(
                "sandbox-mode",
                "Sandbox mode",
                "SendGrid sandbox is enabled — messages are accepted but not delivered to real inboxes.",
                "warning",
                "Set SendGrid:UseSandbox=false in production after DNS and sender verification are complete.")
            : new EmailDeliveryChecklistItemResponse(
                "sandbox-mode",
                "Sandbox mode",
                "Sandbox mode is off — SendGrid will attempt real delivery.",
                "complete",
                null);

    internal static EmailDeliveryChecklistItemResponse BuildSenderVerificationItem(
        SendGridLookupResult result,
        string fromEmail) =>
        result.State switch
        {
            SendGridLookupState.Verified => new EmailDeliveryChecklistItemResponse(
                "sender-verification",
                "Sender identity verified",
                result.Detail ?? $"{fromEmail} is verified in SendGrid.",
                "complete",
                null),
            SendGridLookupState.NotVerified => new EmailDeliveryChecklistItemResponse(
                "sender-verification",
                "Sender identity verified",
                $"{fromEmail} is not verified in SendGrid yet.",
                "action_required",
                "In SendGrid: Settings → Sender Authentication → verify the single sender or authenticate the domain for this address."),
            SendGridLookupState.NotApplicable => new EmailDeliveryChecklistItemResponse(
                "sender-verification",
                "Sender identity verified",
                $"Single-sender verification applies for {fromEmail}.",
                "info",
                "Prefer a From address on your authenticated domain when possible."),
            _ => new EmailDeliveryChecklistItemResponse(
                "sender-verification",
                "Sender identity verified",
                BuildUnavailableDetail(
                    "sender verification",
                    result.HttpStatusCode),
                GetUnavailableStatus(result.HttpStatusCode),
                BuildUnavailableHint(result.HttpStatusCode)),
        };

    internal static EmailDeliveryChecklistItemResponse BuildDomainAuthenticationItem(
        SendGridLookupResult result,
        string fromEmail)
    {
        var domain = ExtractEmailDomain(fromEmail);
        if (domain is null)
        {
            return new EmailDeliveryChecklistItemResponse(
                "domain-authentication",
                "Domain authentication (SPF/DKIM)",
                "Sender email format is invalid — domain authentication cannot be evaluated.",
                "action_required",
                "Set SendGrid:FromEmail to a valid email address on your sending domain.");
        }

        if (IsFreemailDomain(domain))
        {
            return new EmailDeliveryChecklistItemResponse(
                "domain-authentication",
                "Domain authentication (SPF/DKIM)",
                $"Sending from {domain} uses a shared mailbox provider — authenticate a custom domain for production campaigns.",
                "info",
                "Use a From address on a domain you control, then add SendGrid DNS records (SPF and DKIM) at your DNS host.");
        }

        return result.State switch
        {
            SendGridLookupState.Verified => new EmailDeliveryChecklistItemResponse(
                "domain-authentication",
                "Domain authentication (SPF/DKIM)",
                result.Detail ?? $"{domain} is authenticated in SendGrid.",
                "complete",
                null),
            SendGridLookupState.NotVerified => new EmailDeliveryChecklistItemResponse(
                "domain-authentication",
                "Domain authentication (SPF/DKIM)",
                $"{domain} is not authenticated in SendGrid yet.",
                "action_required",
                "In SendGrid: Settings → Sender Authentication → Authenticate Your Domain. Add the CNAME records SendGrid provides to your DNS host."),
            _ => new EmailDeliveryChecklistItemResponse(
                "domain-authentication",
                "Domain authentication (SPF/DKIM)",
                BuildUnavailableDetail(
                    $"DNS authentication for {domain}",
                    result.HttpStatusCode),
                GetUnavailableStatus(result.HttpStatusCode),
                BuildUnavailableHint(result.HttpStatusCode)),
        };
    }

    private static string GetUnavailableStatus(int? httpStatusCode) =>
        httpStatusCode is 401 or 403 ? "info" : "warning";

    private static string BuildUnavailableDetail(string subject, int? httpStatusCode) =>
        httpStatusCode is 403
            ? $"Could not read {subject} from SendGrid (API key is restricted to Mail Send). If sender and domain are verified in SendGrid, campaigns can still be delivered."
            : httpStatusCode is 401
                ? $"Could not read {subject} from SendGrid (HTTP 401). If sender and domain are verified in the SendGrid dashboard, campaigns can still be delivered."
                : $"Could not confirm {subject} from SendGrid.";

    private static string? BuildUnavailableHint(int? httpStatusCode) =>
        httpStatusCode is 403
            ? "Optional: create a key with Sender Authentication (Read) or Full Access to show live verification here."
            : httpStatusCode is 401
                ? "Confirm the API key is active under SendGrid → Settings → API Keys. Mail Send-only keys cannot read verification status here."
                : "Open SendGrid → Settings → Sender Authentication and confirm domain and sender status.";

    internal static string? ExtractEmailDomain(string email)
    {
        var atIndex = email.LastIndexOf('@');
        if (atIndex <= 0 || atIndex >= email.Length - 1)
        {
            return null;
        }

        return email[(atIndex + 1)..].Trim().ToLowerInvariant();
    }

    internal static bool IsFreemailDomain(string domain) =>
        domain is "gmail.com" or "googlemail.com" or "yahoo.com" or "outlook.com" or "hotmail.com" or "live.com" or "icloud.com";
}

internal enum SendGridLookupState
{
    Unavailable,
    NotVerified,
    Verified,
    NotApplicable,
}

internal sealed record SendGridLookupResult(
    SendGridLookupState State,
    string? Detail = null,
    int? HttpStatusCode = null)
{
    public static SendGridLookupResult Verified(string? detail = null) =>
        new(SendGridLookupState.Verified, detail);

    public static SendGridLookupResult NotVerified() =>
        new(SendGridLookupState.NotVerified);

    public static SendGridLookupResult NotApplicable() =>
        new(SendGridLookupState.NotApplicable);

    public static SendGridLookupResult Unavailable(int? httpStatusCode = null) =>
        new(SendGridLookupState.Unavailable, HttpStatusCode: httpStatusCode);
}

internal static class SendGridDeliveryStatusParser
{
    public static bool IsSenderVerified(string responseBody, string fromEmail)
    {
        using var document = JsonDocument.Parse(responseBody);
        if (!document.RootElement.TryGetProperty("results", out var results) ||
            results.ValueKind != JsonValueKind.Array)
        {
            return false;
        }

        var normalizedFrom = fromEmail.Trim().ToLowerInvariant();

        foreach (var result in results.EnumerateArray())
        {
            if (!TryGetVerifiedFlag(result, out var verified) || !verified)
            {
                continue;
            }

            if (TryGetEmail(result, "from_email", out var candidate) &&
                string.Equals(candidate, normalizedFrom, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }

            if (TryGetEmail(result, "from", out candidate) &&
                string.Equals(candidate, normalizedFrom, StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    public static bool TryGetDomainAuthenticationState(
        string responseBody,
        string domain,
        out SendGridLookupResult result)
    {
        result = SendGridLookupResult.NotVerified();
        using var document = JsonDocument.Parse(responseBody);
        var entries = GetDomainEntries(document.RootElement);
        if (entries is null)
        {
            return false;
        }

        var normalizedDomain = domain.Trim().ToLowerInvariant();
        var matched = false;

        foreach (var entry in entries)
        {
            if (!TryGetDomainName(entry, out var entryDomain) ||
                !string.Equals(entryDomain, normalizedDomain, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            matched = true;
            if (IsDomainEntryValid(entry))
            {
                result = SendGridLookupResult.Verified($"{normalizedDomain} is authenticated in SendGrid.");
                return true;
            }
        }

        if (matched)
        {
            result = SendGridLookupResult.NotVerified();
            return true;
        }

        return false;
    }

    private static IEnumerable<JsonElement>? GetDomainEntries(JsonElement root)
    {
        if (root.ValueKind == JsonValueKind.Array)
        {
            return root.EnumerateArray();
        }

        if (root.TryGetProperty("domains", out var domains) &&
            domains.ValueKind == JsonValueKind.Array)
        {
            return domains.EnumerateArray();
        }

        if (root.TryGetProperty("domain", out _))
        {
            return [root];
        }

        return null;
    }

    private static bool TryGetDomainName(JsonElement entry, out string domain)
    {
        domain = string.Empty;

        if (!entry.TryGetProperty("domain", out var domainElement) ||
            domainElement.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        domain = domainElement.GetString()?.Trim() ?? string.Empty;
        return domain.Length > 0;
    }

    private static bool IsDomainEntryValid(JsonElement entry)
    {
        if (entry.TryGetProperty("valid", out var validElement) &&
            validElement.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            return validElement.GetBoolean();
        }

        if (entry.TryGetProperty("dns", out var dnsElement) &&
            dnsElement.TryGetProperty("valid", out var dnsValidElement) &&
            dnsValidElement.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            return dnsValidElement.GetBoolean();
        }

        return false;
    }

    private static bool TryGetVerifiedFlag(JsonElement result, out bool verified)
    {
        verified = false;

        if (result.TryGetProperty("verified", out var verifiedElement) &&
            verifiedElement.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            verified = verifiedElement.GetBoolean();
            return true;
        }

        if (result.TryGetProperty("status", out var statusElement) &&
            statusElement.ValueKind == JsonValueKind.String)
        {
            verified = string.Equals(statusElement.GetString(), "verified", StringComparison.OrdinalIgnoreCase);
            return true;
        }

        return false;
    }

    private static bool TryGetEmail(JsonElement result, string propertyName, out string email)
    {
        email = string.Empty;

        if (!result.TryGetProperty(propertyName, out var emailElement) ||
            emailElement.ValueKind != JsonValueKind.String)
        {
            return false;
        }

        email = emailElement.GetString()?.Trim() ?? string.Empty;
        return email.Length > 0;
    }
}
