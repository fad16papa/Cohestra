using Cohestra.Infrastructure.Billing;

namespace Cohestra.Infrastructure.Tests.Billing;

public sealed class PaddleSignatureTests
{
    [Fact]
    public void Valid_signature_is_accepted()
    {
        const string secret = "pdl_ntfset_test";
        const string body = """{"event_id":"evt_1","event_type":"subscription.updated"}""";
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var header = $"ts={ts};h1={PaddleSignature.ComputeHexHmac(secret, $"{ts}:{body}")}";

        var ok = PaddleSignature.TryValidate(secret, header, body, DateTimeOffset.UtcNow, out var reason);

        Assert.True(ok, reason);
    }

    [Fact]
    public void Tampered_body_is_rejected()
    {
        const string secret = "pdl_ntfset_test";
        const string body = """{"event_id":"evt_1"}""";
        var ts = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var header = $"ts={ts};h1={PaddleSignature.ComputeHexHmac(secret, $"{ts}:{body}")}";

        var ok = PaddleSignature.TryValidate(secret, header, """{"event_id":"evt_2"}""", DateTimeOffset.UtcNow, out var reason);

        Assert.False(ok);
        Assert.Equal("HMAC mismatch.", reason);
    }

    [Fact]
    public void Stale_timestamp_is_rejected()
    {
        const string secret = "pdl_ntfset_test";
        const string body = "{}";
        var ts = DateTimeOffset.UtcNow.AddMinutes(-20).ToUnixTimeSeconds();
        var header = $"ts={ts};h1={PaddleSignature.ComputeHexHmac(secret, $"{ts}:{body}")}";

        var ok = PaddleSignature.TryValidate(secret, header, body, DateTimeOffset.UtcNow, out var reason);

        Assert.False(ok);
        Assert.Equal("Timestamp outside tolerance.", reason);
    }
}
