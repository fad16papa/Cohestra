using Cohestra.Application.RateLimiting;
using Cohestra.Api.Infrastructure;
using Cohestra.Infrastructure.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Tests.RateLimiting;

public sealed class RedisRateLimiterOperationsTests
{
    [Fact]
    public async Task EvaluateAllowAsync_throws_rate_limiter_unavailable_on_redis_connection_fault()
    {
        var ex = await Assert.ThrowsAsync<RateLimiterUnavailableException>(() =>
            RedisRateLimiterOperations.EvaluateAllowAsync(
                () => throw new RedisException("Simulated outage"),
                "TestLimiter"));

        Assert.Equal("TestLimiter", ex.LimiterName);
    }

    [Fact]
    public async Task ExecuteAsync_throws_rate_limiter_unavailable_on_redis_timeout()
    {
        await Assert.ThrowsAsync<RateLimiterUnavailableException>(() =>
            RedisRateLimiterOperations.ExecuteAsync(
                () => throw new RedisTimeoutException("Simulated timeout", CommandStatus.Unknown),
                "TestLimiter"));
    }
}

public sealed class GlobalExceptionHandlerRateLimiterTests
{
    [Fact]
    public async Task TryHandleAsync_maps_rate_limiter_unavailable_to_503()
    {
        var context = new DefaultHttpContext();
        context.Request.Path = "/api/v1/auth/verify-email";
        context.Request.Method = HttpMethods.Post;
        context.Response.Body = new MemoryStream();
        context.RequestServices = new ServiceCollection()
            .AddSingleton<IHostEnvironment>(new TestHostEnvironment())
            .BuildServiceProvider();

        var handler = new GlobalExceptionHandler(NullLogger<GlobalExceptionHandler>.Instance);
        var inner = new RedisException("Simulated outage");
        var exception = new RateLimiterUnavailableException("AuthOtpVerify", inner);

        var handled = await handler.TryHandleAsync(context, exception, CancellationToken.None);

        Assert.True(handled);
        Assert.Equal(StatusCodes.Status503ServiceUnavailable, context.Response.StatusCode);
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(context.Response.Body);
        var body = await reader.ReadToEndAsync();
        Assert.Contains(RateLimitErrorCodes.Unavailable, body);
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = Environments.Production;
        public string ApplicationName { get; set; } = "Cohestra.Tests";
        public string ContentRootPath { get; set; } = AppContext.BaseDirectory;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}
