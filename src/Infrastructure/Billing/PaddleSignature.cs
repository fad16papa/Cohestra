using System.Security.Cryptography;
using System.Text;

namespace Cohestra.Infrastructure.Billing;

public static class PaddleSignature
{
    public static readonly TimeSpan DefaultTolerance = TimeSpan.FromMinutes(5);

    public static bool TryValidate(
        string webhookSecret,
        string signatureHeader,
        string rawBody,
        DateTimeOffset now,
        out string reason) =>
        TryValidate(webhookSecret, signatureHeader, rawBody, now, DefaultTolerance, out reason);

    public static bool TryValidate(
        string webhookSecret,
        string signatureHeader,
        string rawBody,
        DateTimeOffset now,
        TimeSpan tolerance,
        out string reason)
    {
        reason = string.Empty;
        if (string.IsNullOrWhiteSpace(webhookSecret))
        {
            reason = "Missing webhook secret.";
            return false;
        }

        if (string.IsNullOrWhiteSpace(signatureHeader))
        {
            reason = "Missing Paddle-Signature header.";
            return false;
        }

        long? timestamp = null;
        var hashes = new List<string>();
        foreach (var part in signatureHeader.Split(
                     ';',
                     StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            var separator = part.IndexOf('=');
            if (separator <= 0)
            {
                continue;
            }

            var key = part[..separator];
            var value = part[(separator + 1)..];
            if (key.Equals("ts", StringComparison.Ordinal) && long.TryParse(value, out var parsed))
            {
                timestamp = parsed;
            }
            else if (key.Equals("h1", StringComparison.Ordinal) && value.Length > 0)
            {
                hashes.Add(value);
            }
        }

        if (timestamp is null || hashes.Count == 0)
        {
            reason = "Malformed Paddle-Signature header.";
            return false;
        }

        DateTimeOffset eventTime;
        try
        {
            eventTime = DateTimeOffset.FromUnixTimeSeconds(timestamp.Value);
        }
        catch (ArgumentOutOfRangeException)
        {
            reason = "Invalid signature timestamp.";
            return false;
        }

        if (Math.Abs((now - eventTime).TotalSeconds) > tolerance.TotalSeconds)
        {
            reason = "Timestamp outside tolerance.";
            return false;
        }

        var expected = ComputeHexHmac(webhookSecret, $"{timestamp}:{rawBody}");
        foreach (var hash in hashes)
        {
            if (FixedTimeEqualsHex(expected, hash))
            {
                return true;
            }
        }

        reason = "HMAC mismatch.";
        return false;
    }

    internal static string ComputeHexHmac(string secret, string payload)
    {
        var key = Encoding.UTF8.GetBytes(secret);
        var data = Encoding.UTF8.GetBytes(payload);
        var hash = HMACSHA256.HashData(key, data);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private static bool FixedTimeEqualsHex(string left, string right)
    {
        if (left.Length != right.Length)
        {
            return false;
        }

        var mismatch = 0;
        for (var i = 0; i < left.Length; i++)
        {
            mismatch |= char.ToLowerInvariant(left[i]) ^ char.ToLowerInvariant(right[i]);
        }

        return mismatch == 0;
    }
}
