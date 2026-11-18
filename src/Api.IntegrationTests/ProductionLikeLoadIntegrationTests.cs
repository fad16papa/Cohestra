using System.Diagnostics;
using System.Net;
using System.Text.Json;
using Cohestra.Api.IntegrationTests.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Cohestra.Api.IntegrationTests;

[Trait("Category", "Integration")]
[Trait("Story", "46.12")]
[Collection(ProductionLikeLoadCollection.Name)]
public sealed class ProductionLikeLoadIntegrationTests(ProductionLikeLoadFixture fixture)
{
    private const int RequestCount = 320;
    private const int Concurrency = 4;

    private ProductionLikeLoadWebApplicationFactory Factory => fixture.Factory;

    [SkippableFact]
    public async Task HealthEndpoint_shortBoundedLoad_recordsPercentiles_withLoadTestSeedDisabled()
    {
        IntegrationTestHelpers.SkipIfUnavailable(Factory);

        var config = Factory.Services.GetRequiredService<IConfiguration>();
        Assert.False(config.GetValue("LoadTestSeed:Enabled", true));
        Assert.False(config.GetValue("LoadTestSeed:ForceReseed", true));

        using var client = Factory.CreateClient();
        client.BaseAddress = new Uri("http://localhost");
        client.DefaultRequestHeaders.Host = "localhost";

        var latenciesMs = new List<double>(RequestCount);
        var errors = 0;
        var gate = new SemaphoreSlim(Concurrency, Concurrency);

        var workers = Enumerable.Range(0, Concurrency).Select(async _ =>
        {
            var perWorker = RequestCount / Concurrency;
            for (var i = 0; i < perWorker; i++)
            {
                await gate.WaitAsync();
                try
                {
                    var sw = Stopwatch.StartNew();
                    using var response = await client.GetAsync("/health");
                    sw.Stop();
                    if (response.StatusCode == HttpStatusCode.OK)
                    {
                        lock (latenciesMs)
                        {
                            latenciesMs.Add(sw.Elapsed.TotalMilliseconds);
                        }
                    }
                    else
                    {
                        Interlocked.Increment(ref errors);
                    }
                }
                catch (HttpRequestException)
                {
                    Interlocked.Increment(ref errors);
                }
                finally
                {
                    gate.Release();
                }
            }
        });

        await Task.WhenAll(workers);

        Skip.If(latenciesMs.Count == 0, "No successful /health responses during bounded load.");

        latenciesMs.Sort();
        var p95 = Percentile(latenciesMs, 95);
        var p99 = Percentile(latenciesMs, 99);
        var errorRate = errors / (double)RequestCount;

        var metrics = new
        {
            recordedAt = DateTimeOffset.UtcNow,
            requestCount = RequestCount,
            concurrency = Concurrency,
            successful = latenciesMs.Count,
            errors,
            errorRate = Math.Round(errorRate, 6),
            latencyMs = new
            {
                p50 = Math.Round(Percentile(latenciesMs, 50), 3),
                p95 = Math.Round(p95, 3),
                p99 = Math.Round(p99, 3),
                max = Math.Round(latenciesMs[^1], 3),
            },
            path = "/health",
            loadTestSeedEnabled = false,
            customerDnsUsed = false,
            productionDropletContacted = false,
            future46_7LatencyWarningMs = Math.Round(p95 * 2, 3),
        };

        var metricsPath = ResolveMetricsPath();
        Directory.CreateDirectory(Path.GetDirectoryName(metricsPath)!);
        await File.WriteAllTextAsync(
            metricsPath,
            JsonSerializer.Serialize(metrics, new JsonSerializerOptions { WriteIndented = true }));

        Assert.True(p95 >= 0);
        Assert.True(p99 >= p95);
        Assert.True(errorRate < 0.05, $"error rate too high: {errorRate}");
    }

    private static double Percentile(IReadOnlyList<double> sorted, double p)
    {
        if (sorted.Count == 0)
        {
            return 0;
        }

        var k = (sorted.Count - 1) * (p / 100.0);
        var f = (int)k;
        var c = Math.Min(f + 1, sorted.Count - 1);
        if (f == c)
        {
            return sorted[f];
        }

        return sorted[f] + (sorted[c] - sorted[f]) * (k - f);
    }

    private static string ResolveMetricsPath()
    {
        var fromEnv = Environment.GetEnvironmentVariable("COHESTRA_LOAD_METRICS_PATH");
        if (!string.IsNullOrWhiteSpace(fromEnv))
        {
            return Path.GetFullPath(fromEnv);
        }

        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "Cohestra.sln")))
            {
                return Path.Combine(
                    dir.FullName,
                    "_bmad-output",
                    "implementation-artifacts",
                    "evidence",
                    "46-12",
                    "load-metrics.json");
            }

            dir = dir.Parent;
        }

        throw new InvalidOperationException("Could not resolve repository root for load metrics.");
    }
}