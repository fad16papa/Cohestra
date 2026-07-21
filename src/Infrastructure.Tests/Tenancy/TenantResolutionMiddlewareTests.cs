using System.Security.Claims;
using System.Text.Json;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Http;

namespace Cohestra.Infrastructure.Tests.Tenancy;

public sealed class TenantResolutionMiddlewareTests
{
    [Fact]
    public async Task Admin_allows_matching_tenant_id_and_host_and_sets_context()
    {
        var tenantId = TenantIds.Default;
        var context = CreateContext(
            "/api/v1/admin/me",
            host: "localhost",
            authenticated: true,
            roles: [OperatorSeeder.TenantAdminRole],
            tenantId: tenantId);
        var current = new CurrentTenant();

        var called = false;
        var middleware = new TenantResolutionMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Ok(tenantId, "default")),
            current);

        Assert.True(called);
        Assert.True(current.IsResolved);
        Assert.Equal(tenantId, current.TenantId);
        Assert.Equal("default", current.Slug);
    }

    [Fact]
    public async Task Admin_rejects_missing_tenant_id_claim()
    {
        var context = CreateContext(
            "/api/v1/admin/me",
            host: "localhost",
            authenticated: true,
            roles: [OperatorSeeder.TenantAdminRole],
            tenantId: null);

        var middleware = new TenantResolutionMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Ok(TenantIds.Default, "default")),
            new CurrentTenant());

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        Assert.Equal(TenantResolutionMiddleware.TenantMismatchErrorCode, ReadErrorCode(context));
    }

    [Fact]
    public async Task Admin_rejects_host_tenant_mismatch()
    {
        var other = Guid.CreateVersion7();
        var context = CreateContext(
            "/api/v1/admin/me",
            host: "acme.localhost",
            authenticated: true,
            roles: [OperatorSeeder.TenantAdminRole],
            tenantId: TenantIds.Default);

        var middleware = new TenantResolutionMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Ok(other, "acme")),
            new CurrentTenant());

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task Admin_rejects_platform_admin_only_without_tenant_id()
    {
        var context = CreateContext(
            "/api/v1/admin/me",
            host: "localhost",
            authenticated: true,
            roles: [PlatformAdminSeeder.PlatformAdminRole],
            tenantId: null);

        var middleware = new TenantResolutionMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Fail("unused")),
            new CurrentTenant());

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task Admin_unauthenticated_returns_401()
    {
        var context = CreateContext(
            "/api/v1/admin/me",
            host: "localhost",
            authenticated: false,
            roles: [],
            tenantId: null);

        var middleware = new TenantResolutionMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Ok(TenantIds.Default, "default")),
            new CurrentTenant());

        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
    }

    [Fact]
    public async Task Public_sets_context_when_host_resolves()
    {
        var tenantId = Guid.CreateVersion7();
        var context = CreateContext(
            "/api/v1/public/site",
            host: "acme.localhost",
            authenticated: false,
            roles: [],
            tenantId: null);
        var current = new CurrentTenant();

        var called = false;
        var middleware = new TenantResolutionMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Ok(tenantId, "acme")),
            current);

        Assert.True(called);
        Assert.True(current.IsResolved);
        Assert.Equal(tenantId, current.TenantId);
        Assert.Equal("acme", current.Slug);
    }

    [Fact]
    public async Task Public_unresolved_returns_404()
    {
        var context = CreateContext(
            "/api/v1/public/site",
            host: "unknown.localhost",
            authenticated: false,
            roles: [],
            tenantId: null);

        var middleware = new TenantResolutionMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Fail("Unknown tenant workspace 'unknown'.")),
            new CurrentTenant());

        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);
        Assert.Equal(TenantResolutionMiddleware.TenantUnresolvedErrorCode, ReadErrorCode(context));
    }

    [Fact]
    public async Task Public_marketing_apex_returns_404_without_tenant_context()
    {
        var context = CreateContext(
            "/api/v1/public/site",
            host: "cohestra.app",
            authenticated: false,
            roles: [],
            tenantId: null);
        var current = new CurrentTenant();

        var middleware = new TenantResolutionMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.MarketingOnly()),
            current);

        Assert.Equal(StatusCodes.Status404NotFound, context.Response.StatusCode);
        Assert.False(current.IsResolved);
        Assert.True(current.IsMarketingHost);
        Assert.Null(current.TenantId);
    }

    [Fact]
    public async Task Platform_path_skips_tenant_requirement()
    {
        var context = CreateContext(
            "/api/v1/platform/me",
            host: "localhost",
            authenticated: true,
            roles: [PlatformAdminSeeder.PlatformAdminRole],
            tenantId: null);
        var current = new CurrentTenant();

        var called = false;
        var middleware = new TenantResolutionMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Fail("unused")),
            current);

        Assert.True(called);
        Assert.False(current.IsResolved);
    }

    [Fact]
    public async Task System_path_skips_tenant_requirement()
    {
        Assert.True(TenantResolutionMiddleware.IsSkipTenantRequirementPath("/api/v1/system/info"));

        var context = CreateContext(
            "/api/v1/system/info",
            host: "localhost",
            authenticated: true,
            roles: [PlatformAdminSeeder.PlatformAdminRole],
            tenantId: null);

        var called = false;
        var middleware = new TenantResolutionMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Fail("unused")),
            new CurrentTenant());

        Assert.True(called);
    }

    [Fact]
    public async Task Skips_anonymous_login_but_aligns_change_password()
    {
        Assert.True(TenantResolutionMiddleware.IsAnonymousAuthPath("/api/v1/auth/login"));
        Assert.True(TenantResolutionMiddleware.RequiresAdminTenantAlignment("/api/v1/auth/change-password"));
        Assert.False(TenantResolutionMiddleware.IsAnonymousAuthPath("/api/v1/auth/change-password"));

        var context = CreateContext(
            "/api/v1/auth/change-password",
            host: "localhost",
            authenticated: true,
            roles: [OperatorSeeder.TenantAdminRole],
            tenantId: null);

        var middleware = new TenantResolutionMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Ok(TenantIds.Default, "default")),
            new CurrentTenant());

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task Ignores_X_Tenant_Id_header_for_public_resolution()
    {
        var tenantId = Guid.CreateVersion7();
        var context = CreateContext(
            "/api/v1/public/site",
            host: "acme.localhost",
            authenticated: false,
            roles: [],
            tenantId: null);
        context.Request.Headers["X-Tenant-Id"] = TenantIds.Default.ToString();
        var current = new CurrentTenant();

        var middleware = new TenantResolutionMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Ok(tenantId, "acme")),
            current);

        Assert.Equal(tenantId, current.TenantId);
        Assert.NotEqual(TenantIds.Default, current.TenantId);
    }

    private static string? ReadErrorCode(HttpContext context)
    {
        context.Response.Body.Position = 0;
        using var reader = new StreamReader(context.Response.Body);
        var json = reader.ReadToEnd();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.TryGetProperty("errorCode", out var code) ? code.GetString() : null;
    }

    private static DefaultHttpContext CreateContext(
        string path,
        string host,
        bool authenticated,
        IEnumerable<string> roles,
        Guid? tenantId)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.Host = new HostString(host);
        context.Response.Body = new MemoryStream();

        if (authenticated)
        {
            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            };
            foreach (var role in roles)
            {
                claims.Add(new Claim(ClaimTypes.Role, role));
            }

            if (tenantId is not null)
            {
                claims.Add(new Claim(TenantResolutionMiddleware.TenantIdClaimType, tenantId.Value.ToString()));
            }

            context.User = new ClaimsPrincipal(new ClaimsIdentity(claims, authenticationType: "Bearer"));
        }

        return context;
    }

    private sealed class StubHostResolver(TenantHostResolution resolution) : ITenantHostResolver
    {
        public Task<TenantHostResolution> ResolveAsync(
            string? hostHeader,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(resolution);
    }
}
