using Cohestra.Infrastructure.Tenancy;
using Microsoft.AspNetCore.Http;

namespace Cohestra.Infrastructure.Tests.Tenancy;

public sealed class TenantRequestHostTests
{
    [Fact]
    public void GetEffectiveHost_prefers_x_forwarded_host()
    {
        var context = new DefaultHttpContext();
        context.Request.Host = new HostString("api", 8080);
        context.Request.Headers[TenantRequestHost.ForwardedHostHeaderName] = "default.localhost";

        Assert.Equal("default.localhost", TenantRequestHost.GetEffectiveHost(context));
    }

    [Fact]
    public void GetEffectiveHost_falls_back_to_request_host()
    {
        var context = new DefaultHttpContext();
        context.Request.Host = new HostString("localhost", 80);

        Assert.Equal("localhost:80", TenantRequestHost.GetEffectiveHost(context));
    }
}
