namespace Cohestra.Infrastructure.Support;

internal sealed record SupportIssueFilerOutboxPayload(Guid IssueId, Guid? ReplyId);
