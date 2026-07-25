using System.Security.Claims;
using Cohestra.Domain.Tenants;
using Microsoft.AspNetCore.Authorization;

namespace Cohestra.Infrastructure.Auth;

public static class TenantAuthorizationExtensions
{
    public static AuthorizationOptions AddTenantMembershipPolicies(this AuthorizationOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);

        options.AddPolicy(TenantAuthPolicies.TenantAdminOnly, policy =>
        {
            policy.RequireAuthenticatedUser();
            policy.RequireAssertion(HasParseableTenantId);
            policy.RequireClaim(
                JwtTokenService.MembershipRoleClaimType,
                TenantMembershipRole.TenantAdmin.ToString());
        });

        options.AddPolicy(TenantAuthPolicies.TenantOperator, policy =>
        {
            policy.RequireAuthenticatedUser();
            policy.RequireAssertion(HasParseableTenantId);
            policy.RequireClaim(
                JwtTokenService.MembershipRoleClaimType,
                TenantMembershipRole.TenantAdmin.ToString(),
                TenantMembershipRole.TenantMember.ToString());
        });

        options.AddPolicy(TenantAuthPolicies.PlatformAdminOnly, policy =>
        {
            policy.RequireAuthenticatedUser();
            policy.RequireClaim(
                JwtTokenService.PlatformAdminClaimType,
                JwtTokenService.PlatformAdminClaimValue);
            // No hybrid dual-plane tokens: reject any tenant_id or membership role claim.
            policy.RequireAssertion(IsPlatformOnlyPrincipal);
        });

        return options;
    }

    private static bool HasParseableTenantId(AuthorizationHandlerContext context)
    {
        var raw = context.User.FindFirstValue(JwtTokenService.TenantIdClaimType);
        return Guid.TryParse(raw, out var tenantId) && tenantId != Guid.Empty;
    }

    private static bool IsPlatformOnlyPrincipal(AuthorizationHandlerContext context)
    {
        var hasTenantId = context.User
            .FindAll(JwtTokenService.TenantIdClaimType)
            .Any(c => !string.IsNullOrWhiteSpace(c.Value));

        var hasMembershipRole = context.User
            .FindAll(JwtTokenService.MembershipRoleClaimType)
            .Any(c => !string.IsNullOrWhiteSpace(c.Value));

        return !hasTenantId && !hasMembershipRole;
    }
}
