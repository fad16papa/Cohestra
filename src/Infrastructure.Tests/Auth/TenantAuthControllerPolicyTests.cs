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
    [InlineData(typeof(BrandingAssetsController), TenantAuthPolicies.TenantOperator, false)]
    [InlineData(typeof(SupportIssuesController), TenantAuthPolicies.TenantOperator, false)]
    [InlineData(typeof(CampaignsController), TenantAuthPolicies.TenantOperator, true)]
    [InlineData(typeof(EmailTemplatesController), TenantAuthPolicies.TenantOperator, true)]
    [InlineData(typeof(EmailDeliveryController), TenantAuthPolicies.TenantAdminOnly, false)]
    [InlineData(typeof(TeamController), TenantAuthPolicies.TenantAdminOnly, false)]
    [InlineData(typeof(BillingController), TenantAuthPolicies.TenantAdminOnly, false)]
    [InlineData(typeof(AdminTenantEmbedController), TenantAuthPolicies.TenantAdminOnly, false)]
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
    public void Appearance_patch_allows_tenant_operators()
    {
        var method = typeof(AdminController).GetMethod(nameof(AdminController.UpdateAppearance));
        Assert.NotNull(method);
        var authorize = method!.GetCustomAttributes<AuthorizeAttribute>(inherit: true).ToArray();
        Assert.DoesNotContain(authorize, a => a.Policy == TenantAuthPolicies.TenantAdminOnly);
        Assert.Contains(
            typeof(AdminController).GetCustomAttributes<AuthorizeAttribute>(inherit: true),
            a => a.Policy == TenantAuthPolicies.TenantOperator);
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
    public void PlatformOps_overview_is_get_on_ops_overview()
    {
        var method = typeof(PlatformOpsController).GetMethod(nameof(PlatformOpsController.GetOverview));
        Assert.NotNull(method);
        var httpGet = method!.GetCustomAttribute<HttpGetAttribute>();
        Assert.NotNull(httpGet);
        Assert.Equal("ops/overview", httpGet!.Template);
        var authorize = typeof(PlatformOpsController).GetCustomAttributes<AuthorizeAttribute>(inherit: true);
        Assert.Contains(authorize, a => a.Policy == TenantAuthPolicies.PlatformAdminOnly);
    }

    [Fact]
    public void PlatformOps_health_is_get_on_ops_health_and_platform_admin_only()
    {
        var method = typeof(PlatformOpsController).GetMethod(nameof(PlatformOpsController.GetHealth));
        Assert.NotNull(method);
        var httpGet = method!.GetCustomAttribute<HttpGetAttribute>();
        Assert.NotNull(httpGet);
        Assert.Equal("ops/health", httpGet!.Template);
        var authorize = typeof(PlatformOpsController).GetCustomAttributes<AuthorizeAttribute>(inherit: true);
        Assert.Contains(authorize, a => a.Policy == TenantAuthPolicies.PlatformAdminOnly);
        Assert.Empty(method!.GetCustomAttributes<AllowAnonymousAttribute>(inherit: true));
    }

    [Fact]
    public void PlatformOps_outbox_summary_and_list_are_get_only_platform_admin()
    {
        var summary = typeof(PlatformOpsController).GetMethod(nameof(PlatformOpsController.GetOutboxSummary));
        var list = typeof(PlatformOpsController).GetMethod(nameof(PlatformOpsController.ListOutbox));
        Assert.NotNull(summary);
        Assert.NotNull(list);
        Assert.Equal("ops/outbox/summary", summary!.GetCustomAttribute<HttpGetAttribute>()!.Template);
        Assert.Equal("ops/outbox", list!.GetCustomAttribute<HttpGetAttribute>()!.Template);
        Assert.Empty(summary.GetCustomAttributes<AllowAnonymousAttribute>(inherit: true));
        Assert.Empty(list.GetCustomAttributes<AllowAnonymousAttribute>(inherit: true));

        var authorize = typeof(PlatformOpsController).GetCustomAttributes<AuthorizeAttribute>(inherit: true);
        Assert.Contains(authorize, a => a.Policy == TenantAuthPolicies.PlatformAdminOnly);

        var mutation = typeof(PlatformOpsController)
            .GetMethods()
            .Where(method => method.GetCustomAttributes(true).Any(attribute =>
                attribute is HttpPostAttribute or HttpPutAttribute or HttpPatchAttribute or HttpDeleteAttribute))
            .Where(method =>
            {
                var template = method.GetCustomAttribute<HttpPostAttribute>()?.Template
                    ?? method.GetCustomAttribute<HttpPutAttribute>()?.Template
                    ?? method.GetCustomAttribute<HttpPatchAttribute>()?.Template
                    ?? method.GetCustomAttribute<HttpDeleteAttribute>()?.Template
                    ?? string.Empty;
                return template.Contains("outbox", StringComparison.OrdinalIgnoreCase)
                    || template.Contains("paddle", StringComparison.OrdinalIgnoreCase)
                    || method.Name.Contains("Outbox", StringComparison.Ordinal)
                    || method.Name.Contains("Paddle", StringComparison.Ordinal);
            })
            .Select(method => method.Name)
            .ToArray();
        Assert.Empty(mutation);
    }

    [Fact]
    public void PlatformOps_paddle_config_and_deliveries_are_get_only_platform_admin()
    {
        var config = typeof(PlatformOpsController).GetMethod(nameof(PlatformOpsController.GetPaddleConfig));
        var list = typeof(PlatformOpsController).GetMethod(nameof(PlatformOpsController.ListPaddleDeliveries));
        Assert.NotNull(config);
        Assert.NotNull(list);
        Assert.Equal("ops/paddle/config", config!.GetCustomAttribute<HttpGetAttribute>()!.Template);
        Assert.Equal("ops/paddle/deliveries", list!.GetCustomAttribute<HttpGetAttribute>()!.Template);
        Assert.Empty(config.GetCustomAttributes<AllowAnonymousAttribute>(inherit: true));
        Assert.Empty(list.GetCustomAttributes<AllowAnonymousAttribute>(inherit: true));

        var authorize = typeof(PlatformOpsController).GetCustomAttributes<AuthorizeAttribute>(inherit: true);
        Assert.Contains(authorize, a => a.Policy == TenantAuthPolicies.PlatformAdminOnly);
    }

    [Fact]
    public void Platform_controllers_use_PlatformAdminOnly_policy()
    {
        foreach (var type in new[]
                 {
                     typeof(PlatformMeController),
                     typeof(PlatformTenantsController),
                     typeof(PlatformSupportIssuesController),
                     typeof(PlatformSupportReportsController),
                     typeof(PlatformOpsController),
                 })
        {
            var authorize = type.GetCustomAttributes<AuthorizeAttribute>(inherit: true).ToArray();
            Assert.Contains(authorize, a => a.Policy == TenantAuthPolicies.PlatformAdminOnly);
            Assert.DoesNotContain(authorize, a => a.Roles == PlatformAdminSeeder.PlatformAdminRole);
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
            var typeAttrs = type.GetCustomAttributes<AuthorizeAttribute>(inherit: true);
            foreach (var attr in typeAttrs)
            {
                if (UsesIdentityTenantAdminRole(attr) || UsesIdentityPlatformAdminRole(attr))
                {
                    offenders.Add($"{type.Name} (class)");
                }
            }

            foreach (var method in type.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly))
            {
                foreach (var attr in method.GetCustomAttributes<AuthorizeAttribute>(inherit: true))
                {
                    if (UsesIdentityTenantAdminRole(attr) || UsesIdentityPlatformAdminRole(attr))
                    {
                        offenders.Add($"{type.Name}.{method.Name}");
                    }
                }
            }
        }

        Assert.True(
            offenders.Count == 0,
            "Leftover Identity Roles= gates on: " + string.Join(", ", offenders));
    }

    private static bool UsesIdentityTenantAdminRole(AuthorizeAttribute attr) =>
        !string.IsNullOrWhiteSpace(attr.Roles)
        && attr.Roles
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Contains(OperatorSeeder.TenantAdminRole, StringComparer.Ordinal);

    private static bool UsesIdentityPlatformAdminRole(AuthorizeAttribute attr) =>
        !string.IsNullOrWhiteSpace(attr.Roles)
        && attr.Roles
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Contains(PlatformAdminSeeder.PlatformAdminRole, StringComparer.Ordinal);
}
