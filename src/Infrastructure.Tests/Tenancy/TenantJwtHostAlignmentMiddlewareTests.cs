using System.Security.Claims;
using Cohestra.Application.Tenants;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Auth;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Http;

namespace Cohestra.Infrastructure.Tests.Tenancy;

public sealed class TenantJwtHostAlignmentMiddlewareTests
{
    [Fact]
    public async Task Allows_matching_tenant_id_and_host()
    {
        var tenantId = TenantIds.Default;
        var context = CreateContext(
            "/api/v1/admin/me",
            host: "localhost",
            authenticated: true,
            roles: [OperatorSeeder.TenantAdminRole],
            tenantId: tenantId);

        var called = false;
        var middleware = new TenantJwtHostAlignmentMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(context, new StubHostResolver(TenantHostResolution.Ok(tenantId, "default")));

        Assert.True(called);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode == 0 ? 200 : context.Response.StatusCode);
    }

    [Fact]
    public async Task Rejects_missing_tenant_id_claim()
    {
        var context = CreateContext(
            "/api/v1/admin/me",
            host: "localhost",
            authenticated: true,
            roles: [OperatorSeeder.TenantAdminRole],
            tenantId: null);

        var middleware = new TenantJwtHostAlignmentMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Ok(TenantIds.Default, "default")));

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task Rejects_host_tenant_mismatch()
    {
        var other = Guid.CreateVersion7();
        var context = CreateContext(
            "/api/v1/admin/me",
            host: "acme.localhost",
            authenticated: true,
            roles: [OperatorSeeder.TenantAdminRole],
            tenantId: TenantIds.Default);

        var middleware = new TenantJwtHostAlignmentMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(context, new StubHostResolver(TenantHostResolution.Ok(other, "acme")));

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task Rejects_platform_admin_only_on_tenant_admin_path()
    {
        var context = CreateContext(
            "/api/v1/admin/me",
            host: "localhost",
            authenticated: true,
            roles: [PlatformAdminSeeder.PlatformAdminRole],
            tenantId: null);

        var middleware = new TenantJwtHostAlignmentMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Fail("unused")));

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
    }

    [Fact]
    public async Task Skips_platform_path_without_tenant_id()
    {
        var context = CreateContext(
            "/api/v1/platform/me",
            host: "localhost",
            authenticated: true,
            roles: [PlatformAdminSeeder.PlatformAdminRole],
            tenantId: null);

        var called = false;
        var middleware = new TenantJwtHostAlignmentMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Fail("unused")));

        Assert.True(called);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode == 0 ? 200 : context.Response.StatusCode);
    }

    [Fact]
    public async Task Skips_system_path_for_platform_admin_without_tenant_id()
    {
        Assert.False(TenantJwtHostAlignmentMiddleware.RequiresTenantHostAlignment("/api/v1/system/info"));

        var context = CreateContext(
            "/api/v1/system/info",
            host: "localhost",
            authenticated: true,
            roles: [PlatformAdminSeeder.PlatformAdminRole],
            tenantId: null);

        var called = false;
        var middleware = new TenantJwtHostAlignmentMiddleware(_ =>
        {
            called = true;
            return Task.CompletedTask;
        });

        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Fail("unused")));

        Assert.True(called);
        Assert.Equal(StatusCodes.Status200OK, context.Response.StatusCode == 0 ? 200 : context.Response.StatusCode);
    }

    [Fact]
    public async Task Skips_anonymous_login_but_aligns_change_password()
    {
        Assert.True(TenantJwtHostAlignmentMiddleware.IsAnonymousAuthPath("/api/v1/auth/login"));
        Assert.True(TenantJwtHostAlignmentMiddleware.RequiresTenantHostAlignment("/api/v1/auth/change-password"));
        Assert.False(TenantJwtHostAlignmentMiddleware.IsAnonymousAuthPath("/api/v1/auth/change-password"));

        var context = CreateContext(
            "/api/v1/auth/change-password",
            host: "localhost",
            authenticated: true,
            roles: [OperatorSeeder.TenantAdminRole],
            tenantId: null);

        var middleware = new TenantJwtHostAlignmentMiddleware(_ => Task.CompletedTask);
        await middleware.InvokeAsync(
            context,
            new StubHostResolver(TenantHostResolution.Ok(TenantIds.Default, "default")));

        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
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
                claims.Add(new Claim(TenantJwtHostAlignmentMiddleware.TenantIdClaimType, tenantId.Value.ToString()));
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
