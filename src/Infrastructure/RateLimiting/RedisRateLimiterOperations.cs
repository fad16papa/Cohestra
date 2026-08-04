using Cohestra.Application.RateLimiting;
using StackExchange.Redis;

namespace Cohestra.Infrastructure.RateLimiting;

public static class RedisRateLimiterOperations
{
    public static async Task<bool> EvaluateAllowAsync(
        Func<Task<RedisResult>> evaluateScript,
        string limiterName)
    {
        var result = await ExecuteAsync(evaluateScript, limiterName);
        return result is not null && (int)result == 1;
    }

    public static Task ExecuteAsync(Func<Task> action, string limiterName) =>
        ExecuteAsync(async () =>
        {
            await action();
            return true;
        }, limiterName);

    public static async Task<T> ExecuteAsync<T>(Func<Task<T>> action, string limiterName)
    {
        try
        {
            return await action();
        }
        catch (Exception ex) when (IsRedisFault(ex))
        {
            throw new RateLimiterUnavailableException(limiterName, ex);
        }
    }

    private static bool IsRedisFault(Exception ex) =>
        ex is RedisConnectionException or RedisTimeoutException or RedisException;
}
