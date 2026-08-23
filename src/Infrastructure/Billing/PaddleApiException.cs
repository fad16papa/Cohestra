namespace Cohestra.Infrastructure.Billing;

public sealed class PaddleApiException : Exception
{
    public PaddleApiException(string message, int? statusCode = null, string? errorCode = null)
        : base(message)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
    }

    public PaddleApiException(string message, Exception inner, int? statusCode = null)
        : base(message, inner)
    {
        StatusCode = statusCode;
    }

    public int? StatusCode { get; }

    public string? ErrorCode { get; }

    public bool IsNotFound => StatusCode == 404;
}
