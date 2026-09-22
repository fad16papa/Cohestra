using System.Text.Json;
using Cohestra.Api.Infrastructure;
using Cohestra.Application.Tenants;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class PlanEntitlementExceptionHandlerTests
{
    [Fact]
    public async Task TryHandleAsync_maps_plan_entitlement_to_403_plan_locked()
    {
        var (handler, context) = CreateHandler();
        var exception = new PlanEntitlementException(
            "website",
            "Core",
            "Site pages require a Core plan or higher.");

        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status403Forbidden, context.Response.StatusCode);
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var document = JsonDocument.Parse(await new StreamReader(context.Response.Body).ReadToEndAsync());
        var root = document.RootElement;
        Assert.Equal("plan_locked", root.GetProperty("errorCode").GetString());
        Assert.Equal("website", root.GetProperty("feature").GetString());
        Assert.Equal("Core", root.GetProperty("requiredPlan").GetString());
        Assert.Equal("Site pages require a Core plan or higher.", root.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task TryHandleAsync_keeps_unexpected_exceptions_as_500()
    {
        var (handler, context) = CreateHandler();

        var handled = await handler.TryHandleAsync(
            context,
            new InvalidOperationException("Redis exploded"),
            CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status500InternalServerError, context.Response.StatusCode);
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await new StreamReader(context.Response.Body).ReadToEndAsync();
        Assert.DoesNotContain("plan_locked", body, StringComparison.Ordinal);
        Assert.DoesNotContain("UpgradePanel", body, StringComparison.Ordinal);
    }

    private static (GlobalExceptionHandler Handler, DefaultHttpContext Context) CreateHandler()
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/admin/site";
        context.Request.Method = HttpMethods.Get;
        context.Response.Body = new MemoryStream();
        var hostEnvironment = new TestHostEnvironment();
        context.RequestServices = new ServiceCollection()
            .AddSingleton<IHostEnvironment>(hostEnvironment)
            .BuildServiceProvider();

        return (new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance, hostEnvironment), context);
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Cohestra.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}
