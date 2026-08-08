namespace Cohestra.Contracts.Clients;

public sealed record ClientLeadStatusCountsResponse(
    int NewCount,
    int ContactedCount,
    int ActiveCount,
    int InactiveCount,
    int MergeSuspectCount);
