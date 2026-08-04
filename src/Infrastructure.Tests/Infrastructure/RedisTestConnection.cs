using System.Net.Sockets;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.Tests.Infrastructure;

internal static class RedisTestConnection
{
    internal static IConnectionMultiplexer? TryConnect(out string? skipReason)
    {
        var connection = Environment.GetEnvironmentVariable("ConnectionStrings__Redis") ?? "localhost:6379";

        try
        {
            skipReason = null;
            return ConnectionMultiplexer.Connect(connection);
        }
        catch (Exception ex) when (ex is RedisConnectionException or RedisTimeoutException or SocketException)
        {
            skipReason =
                $"Redis unavailable at '{connection}'. Set ConnectionStrings__Redis (e.g. localhost:6380). {ex.Message}";
            return null;
        }
    }
}
