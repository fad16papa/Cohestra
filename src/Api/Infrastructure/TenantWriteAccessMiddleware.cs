using System.Text.RegularExpressions;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Api.Infrastructure;

/// <summary>
/// Blocks mutating admin API calls when tenant is read-only (OnHold or ReadOnly_OverLimit).
/// Limit-recovery writes (archive, unpublish, remove member) remain allowed when over plan caps.
/// </summary>
public sealed partial class TenantWriteAccessMiddleware(
    RequestDelegate next,
    ILogger<TenantWriteAccessMiddleware> logger)
{
    private static readonly HashSet<string> MutatingMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        HttpMethods.Post,
        HttpMethods.Put,
        HttpMethods.Patch,
        HttpMethods.Delete,
    };

    public async Task InvokeAsync(HttpContext context, ITenantAccessService accessService, ICurrentTenant currentTenant)
    {
        if (ShouldCheckWriteAccess(context)
            && currentTenant.IsResolved
            && currentTenant.TenantId is Guid tenantId
            && context.User.Identity?.IsAuthenticated == true)
        {
            var evaluation = await accessService.EvaluateAsync(tenantId, context.RequestAborted);
            if (evaluation.AdminAccess == TenantAccessMode.ReadOnly)
            {
                var path = context.Request.Path.Value ?? string.Empty;
                if (evaluation.AllowLimitRecoveryWrites
                    && IsLimitRecoveryWrite(context.Request.Method, path))
                {
                    await next(context);
                    return;
                }

                logger.LogInformation(
                    "Blocked write {Method} {Path} for tenant {TenantId} (read-only: {Reason})",
                    context.Request.Method,
                    path,
                    tenantId,
                    evaluation.ReadOnlyReason);

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsJsonAsync(new ProblemDetails
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "Read-only workspace",
                    Detail = evaluation.ReadOnlyReason switch
                    {
                        TenantReadOnlyReason.BillingOnHold =>
                            "Billing is on hold. Open Billing and restore payment to unlock workspace writes.",
                        TenantReadOnlyReason.OverPlanLimits =>
                            "Plan limits require read-only mode. Archive, unpublish, or remove members to get back under your plan limits.",
                        _ =>
                            "Billing or plan limits require read-only mode. Settle billing or reduce usage to restore writes.",
                    },
                    Instance = context.Request.Path,
                    Extensions =
                    {
                        ["errorCode"] = evaluation.ReadOnlyReason switch
                        {
                            TenantReadOnlyReason.BillingOnHold => "billing_on_hold",
                            TenantReadOnlyReason.OverPlanLimits => "read_only_over_limit",
                            _ => "read_only",
                        },
                    },
                });
                return;
            }
        }

        await next(context);
    }

    public static bool IsLimitRecoveryWrite(string method, string path)
    {
        if (!MutatingMethods.Contains(method))
        {
            return false;
        }

        if (ActivityArchiveOrUnpublish().IsMatch(path))
        {
            return HttpMethods.Post.Equals(method, StringComparison.OrdinalIgnoreCase);
        }

        if (TeamMemberRemove().IsMatch(path) || TeamInviteRevoke().IsMatch(path))
        {
            return HttpMethods.Delete.Equals(method, StringComparison.OrdinalIgnoreCase);
        }

        if (CommunityDelete().IsMatch(path))
        {
            return HttpMethods.Delete.Equals(method, StringComparison.OrdinalIgnoreCase);
        }

        return false;
    }

    private static bool ShouldCheckWriteAccess(HttpContext context)
    {
        if (!MutatingMethods.Contains(context.Request.Method))
        {
            return false;
        }

        var path = context.Request.Path.Value ?? string.Empty;
        if (!path.StartsWith("/api/v1/admin/", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Billing checkout + portal must remain reachable for admins to recover.
        if (path.StartsWith("/api/v1/admin/billing", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        // Operator profile preferences (theme, accent) are user-scoped — not tenant workspace writes.
        if (path.Equals("/api/v1/admin/me/appearance", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    }

    [GeneratedRegex(
        "^/api/v1/admin/activities/[0-9a-fA-F-]{36}/(?:archive|unpublish)$",
        RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex ActivityArchiveOrUnpublish();

    [GeneratedRegex(
        "^/api/v1/admin/team/members/[0-9a-fA-F-]{36}$",
        RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex TeamMemberRemove();

    [GeneratedRegex(
        "^/api/v1/admin/team/invites/[0-9a-fA-F-]{36}$",
        RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex TeamInviteRevoke();

    [GeneratedRegex(
        "^/api/v1/admin/communities/[0-9a-fA-F-]{36}$",
        RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex CommunityDelete();
}

public static class TenantWriteAccessMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantWriteAccess(this IApplicationBuilder app) =>
        app.UseMiddleware<TenantWriteAccessMiddleware>();
}
