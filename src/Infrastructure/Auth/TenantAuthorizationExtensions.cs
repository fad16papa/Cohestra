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

        return options;
    }

    private static bool HasParseableTenantId(AuthorizationHandlerContext context)
    {
        var raw = context.User.FindFirstValue(JwtTokenService.TenantIdClaimType);
        return Guid.TryParse(raw, out var tenantId) && tenantId != Guid.Empty;
    }
}
