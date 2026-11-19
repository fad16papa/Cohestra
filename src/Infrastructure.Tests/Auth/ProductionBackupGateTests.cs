using Cohestra.Infrastructure.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Xunit;

namespace Cohestra.Infrastructure.Tests.Auth;

public sealed class ProductionBackupGateTests
{
    private const string ValidSha =
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

    [Fact]
    public void EnsureMigrationsAllowed_MissingConfig_Throws()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cohestra:DeploymentPlane"] = "Production",
            })
            .Build();

        Assert.Throws<InvalidOperationException>(
            () => ProductionBackupGate.EnsureMigrationsAllowed(configuration, NullLogger.Instance));
    }

    [Fact]
    public void EnsureMigrationsAllowed_MissingFile_Throws()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cohestra:DeploymentPlane"] = "Production",
                ["Backup:AttestationPath"] = "/tmp/does-not-exist-attestation.json",
            })
            .Build();

        Assert.Throws<InvalidOperationException>(
            () => ProductionBackupGate.EnsureMigrationsAllowed(configuration, NullLogger.Instance));
    }

    [Fact]
    public void EnsureMigrationsAllowed_BadStatus_Throws()
    {
        using var attestation = WriteAttestation("""{"status":"backup_complete","sha256":"abc","artifact":"x.gpg","database":"rehearsal_dst_disposable"}""");
        var configuration = BuildProductionConfiguration(attestation.Path);

        Assert.Throws<InvalidOperationException>(
            () => ProductionBackupGate.EnsureMigrationsAllowed(configuration, NullLogger.Instance));
    }

    [Fact]
    public void EnsureMigrationsAllowed_BadSha_Throws()
    {
        using var attestation = WriteAttestation(
            $$"""{"status":"verified","sha256":"not-a-valid-digest","artifact":"x.gpg","database":"rehearsal_dst_disposable","production_recovery_proven":false}""");
        var configuration = BuildProductionConfiguration(attestation.Path);

        Assert.Throws<InvalidOperationException>(
            () => ProductionBackupGate.EnsureMigrationsAllowed(configuration, NullLogger.Instance));
    }

    [Fact]
    public void EnsureMigrationsAllowed_ArtifactWithSlash_Throws()
    {
        using var attestation = WriteAttestation(
            $$"""{"status":"verified","sha256":"{{ValidSha}}","artifact":"nested/x.gpg","database":"rehearsal_dst_disposable","production_recovery_proven":false}""");
        var configuration = BuildProductionConfiguration(attestation.Path);

        Assert.Throws<InvalidOperationException>(
            () => ProductionBackupGate.EnsureMigrationsAllowed(configuration, NullLogger.Instance));
    }

    [Fact]
    public void EnsureMigrationsAllowed_SecretLikeAttestationKey_Throws()
    {
        using var attestation = WriteAttestation(
            $$"""{"status":"verified","sha256":"{{ValidSha}}","artifact":"artifact.gpg","database":"rehearsal_dst_disposable","sendgrid_api_key":"ignored","production_recovery_proven":false}""");
        var configuration = BuildProductionConfiguration(attestation.Path);

        Assert.Throws<InvalidOperationException>(
            () => ProductionBackupGate.EnsureMigrationsAllowed(configuration, NullLogger.Instance));
    }

    [Fact]
    public void EnsureMigrationsAllowed_UatPlane_DoesNotThrow()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cohestra:DeploymentPlane"] = "Uat",
            })
            .Build();

        ProductionBackupGate.EnsureMigrationsAllowed(configuration, NullLogger.Instance);
    }

    [Fact]
    public void EnsureMigrationsAllowed_ValidVerifiedAttestation_Allows()
    {
        using var attestation = WriteAttestation(
            $$"""{"status":"verified","sha256":"{{ValidSha}}","artifact":"rehearsal.dump.gpg","database":"rehearsal_dst_disposable","production_recovery_proven":false,"isolation":"localhost"}""");
        var configuration = BuildProductionConfiguration(attestation.Path);

        ProductionBackupGate.EnsureMigrationsAllowed(configuration, NullLogger.Instance);
    }

    [Fact]
    public void EnsureMigrationsAllowed_ProductionRecoveryProvenTrue_Throws()
    {
        using var attestation = WriteAttestation(
            $$"""{"status":"verified","sha256":"{{ValidSha}}","artifact":"rehearsal.dump.gpg","database":"rehearsal_dst_disposable","production_recovery_proven":true}""");
        var configuration = BuildProductionConfiguration(attestation.Path);

        Assert.Throws<InvalidOperationException>(
            () => ProductionBackupGate.EnsureMigrationsAllowed(configuration, NullLogger.Instance));
    }

    [Theory]
    [InlineData("""{"status":"verified","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","artifact":"rehearsal.dump.gpg","database":"rehearsal_dst_disposable"}""")]
    [InlineData("""{"status":"verified","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","artifact":"rehearsal.dump.gpg","database":"rehearsal_dst_disposable","production_recovery_proven":"false"}""")]
    [InlineData("""{"status":"verified","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","artifact":"rehearsal.dump.gpg","database":"rehearsal_dst_disposable","production_recovery_proven":"true"}""")]
    [InlineData("""{"status":"verified","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","artifact":"rehearsal.dump.gpg","database":"rehearsal_dst_disposable","production_recovery_proven":0}""")]
    [InlineData("""{"status":"verified","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","artifact":"rehearsal.dump.gpg","database":"rehearsal_dst_disposable","production_recovery_proven":1}""")]
    [InlineData("""{"status":"verified","sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","artifact":"rehearsal.dump.gpg","database":"rehearsal_dst_disposable","production_recovery_proven":null}""")]
    public void EnsureMigrationsAllowed_RecoveryFlagNotBooleanFalse_Throws(string json)
    {
        using var attestation = WriteAttestation(json);
        var configuration = BuildProductionConfiguration(attestation.Path);

        Assert.Throws<InvalidOperationException>(
            () => ProductionBackupGate.EnsureMigrationsAllowed(configuration, NullLogger.Instance));
    }

    [Fact]
    public void IsAllowedDisposableDatabaseName_RejectsProtectedNames()
    {
        Assert.False(ProductionBackupGate.IsAllowedDisposableDatabaseName("cohestra"));
        Assert.False(ProductionBackupGate.IsAllowedDisposableDatabaseName("cohestra_uat_disposable"));
        Assert.True(ProductionBackupGate.IsAllowedDisposableDatabaseName("rehearsal_dst_disposable"));
    }

    private static IConfiguration BuildProductionConfiguration(string attestationPath)
        => new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Cohestra:DeploymentPlane"] = "Production",
                ["Backup:AttestationPath"] = attestationPath,
            })
            .Build();

    private static TempAttestation WriteAttestation(string json)
    {
        var path = Path.Combine(Path.GetTempPath(), $"attestation-{Guid.NewGuid():N}.json");
        File.WriteAllText(path, json);
        return new TempAttestation(path);
    }

    private sealed class TempAttestation : IDisposable
    {
        public TempAttestation(string path) => Path = path;
        public string Path { get; }
        public void Dispose() => File.Delete(Path);
    }
}