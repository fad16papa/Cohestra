namespace LeadGenerationCrm.Contracts.Activities;

/// <summary>
/// Replaces the activity form schema. Contract: docs/contracts/activity-form-schema-v1.md
/// </summary>
public sealed record SaveActivityFormSchemaRequest(ActivityFormSchemaDto FormSchema);
