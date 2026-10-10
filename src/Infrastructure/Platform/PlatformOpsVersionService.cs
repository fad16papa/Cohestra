using System.Text.RegularExpressions;
using Cohestra.Application.Platform;
using Cohestra.Contracts.Platform;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;

namespace Cohestra.Infrastructure.Platform;

public sealed class PlatformOpsVersionService(
    IHostEnvironment hostEnvironment,
    IConfiguration configuration) : IPlatformOpsVersionService
{
    public const string ApiContractVersion = "v1";
    private static readonly Regex FullGitSha = new("^[0-9a-fA-F]{40}$|^[0-9a-fA-F]{64}$", RegexOptions.Compiled);

    public PlatformOpsVersionResponse Get()
    {
        var observedAt = DateTimeOffset.UtcNow;
        return new PlatformOpsVersionResponse(
            ReadGitSha(observedAt),
            new PlatformKpi<string>(
                hostEnvironment.EnvironmentName,
                PlatformKpiSources.HostEnvironment,
                observedAt,
                PlatformKpiFreshness.Actual),
            new PlatformKpi<string>(
                ApiContractVersion,
                PlatformKpiSources.ApiContract,
                observedAt,
                PlatformKpiFreshness.Actual));
    }

    private PlatformKpi<string?> ReadGitSha(DateTimeOffset observedAt)
    {
        var raw = configuration["GIT_SHA"];
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new PlatformKpi<string?>(
                null,
                PlatformKpiSources.NotInstrumented,
                observedAt,
                PlatformKpiFreshness.MissingInstrumentation);
        }

        var trimmed = raw.Trim();
        if (FullGitSha.IsMatch(trimmed))
        {
            return new PlatformKpi<string?>(
                trimmed,
                PlatformKpiSources.GitSha,
                observedAt,
                PlatformKpiFreshness.Actual);
        }

        return new PlatformKpi<string?>(
            null,
            PlatformKpiSources.GitShaMalformed,
            observedAt,
            PlatformKpiFreshness.Unavailable);
    }
}
