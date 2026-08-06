namespace Cohestra.Domain.Outbox;

public enum OutboxMessageStatus
{
    Pending = 0,
    Processing = 1,
    Completed = 2,
    Failed = 3,
}
