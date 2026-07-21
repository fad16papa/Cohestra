using System.Reflection;
using Cohestra.Api.Controllers.V1;
using Cohestra.Infrastructure.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class TenantAuthControllerPolicyTests
{
    [Theory]
    [InlineData(typeof(ActivitiesController), TenantAuthPolicies.TenantOperator, false)]
    [InlineData(typeof(ClientsController), TenantAuthPolicies.TenantOperator, false)]
    [InlineData(typeof(CommunitiesController), TenantAuthPolicies.TenantOperator, false)]
    [InlineData(typeof(CategoriesController), TenantAuthPolicies.TenantOperator, false)]
    [InlineData(typeof(DashboardController), TenantAuthPolicies.TenantOperator, false)]
    [InlineData(typeof(ReportsController), TenantAuthPolicies.TenantOperator, false)]
    [InlineData(typeof(AdminSiteController), TenantAuthPolicies.TenantOperator, false)]
    [InlineData(typeof(AdminController), TenantAuthPolicies.TenantOperator, false)]
    [InlineData(typeof(CampaignsController), TenantAuthPolicies.TenantOperator, true)]
    [InlineData(typeof(EmailTemplatesController), TenantAuthPolicies.TenantOperator, true)]
    [InlineData(typeof(EmailDeliveryController), TenantAuthPolicies.TenantAdminOnly, false)]
    [InlineData(typeof(TeamController), TenantAuthPolicies.TenantAdminOnly, false)]
    [InlineData(typeof(BillingController), TenantAuthPolicies.TenantAdminOnly, false)]
    public void Controller_uses_expected_membership_policy(Type controller, string policy, bool requireProPlan)
    {
        var authorize = controller.GetCustomAttributes<AuthorizeAttribute>(inherit: true).ToArray();
        Assert.Contains(authorize, a => a.Policy == policy);
        Assert.DoesNotContain(authorize, a => a.Roles == OperatorSeeder.TenantAdminRole);

        var hasPro = controller.GetCustomAttributes(typeof(RequireProPlanAttribute), inherit: true).Length > 0
            || controller.GetCustomAttributes(typeof(ServiceFilterAttribute), inherit: true)
                .OfType<ServiceFilterAttribute>()
                .Any(a => a.ServiceType == typeof(RequireProPlanFilter));

        // TypeFilterAttribute subclass
        hasPro |= controller.GetCustomAttributes(true).Any(a => a is RequireProPlanAttribute);
        Assert.Equal(requireProPlan, hasPro);
    }

    [Fact]
    public void Appearance_patch_is_admin_only()
    {
        var method = typeof(AdminController).GetMethod(nameof(AdminController.UpdateAppearance));
        Assert.NotNull(method);
        var authorize = method!.GetCustomAttributes<AuthorizeAttribute>(inherit: true).ToArray();
        Assert.Contains(authorize, a => a.Policy == TenantAuthPolicies.TenantAdminOnly);
    }

    [Fact]
    public void Change_password_is_tenant_operator()
    {
        var method = typeof(AuthController).GetMethod(nameof(AuthController.ChangePassword));
        Assert.NotNull(method);
        var authorize = method!.GetCustomAttributes<AuthorizeAttribute>(inherit: true).ToArray();
        Assert.Contains(authorize, a => a.Policy == TenantAuthPolicies.TenantOperator);
    }

    [Fact]
    public void Platform_controllers_remain_identity_platform_admin()
    {
        foreach (var type in new[] { typeof(PlatformMeController), typeof(PlatformTenantsController) })
        {
            var authorize = type.GetCustomAttributes<AuthorizeAttribute>(inherit: true).ToArray();
            Assert.Contains(authorize, a => a.Roles == PlatformAdminSeeder.PlatformAdminRole);
            Assert.DoesNotContain(authorize, a => a.Policy == TenantAuthPolicies.TenantOperator
                || a.Policy == TenantAuthPolicies.TenantAdminOnly);
        }
    }

    [Fact]
    public void No_tenant_admin_controller_uses_identity_TenantAdmin_role_gate()
    {
        var controllerTypes = typeof(ActivitiesController).Assembly
            .GetTypes()
            .Where(t => t.IsClass
                && !t.IsAbstract
                && t.Namespace == typeof(ActivitiesController).Namespace
                && typeof(ControllerBase).IsAssignableFrom(t))
            .ToArray();

        Assert.NotEmpty(controllerTypes);

        var offenders = new List<string>();
        foreach (var type in controllerTypes)
        {
            // Platform routes intentionally keep Identity PlatformAdmin Roles=.
            if (type == typeof(PlatformMeController) || type == typeof(PlatformTenantsController))
            {
                continue;
            }

            var typeAttrs = type.GetCustomAttributes<AuthorizeAttribute>(inherit: true);
            foreach (var attr in typeAttrs)
            {
                if (UsesIdentityTenantAdminRole(attr))
                {
                    offenders.Add($"{type.Name} (class)");
                }
            }

            foreach (var method in type.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly))
            {
                foreach (var attr in method.GetCustomAttributes<AuthorizeAttribute>(inherit: true))
                {
                    if (UsesIdentityTenantAdminRole(attr))
                    {
                        offenders.Add($"{type.Name}.{method.Name}");
                    }
                }
            }
        }

        Assert.True(
            offenders.Count == 0,
            "Leftover Identity Roles=TenantAdmin on: " + string.Join(", ", offenders));
    }

    private static bool UsesIdentityTenantAdminRole(AuthorizeAttribute attr) =>
        !string.IsNullOrWhiteSpace(attr.Roles)
        && attr.Roles
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Contains(OperatorSeeder.TenantAdminRole, StringComparer.Ordinal);
}
