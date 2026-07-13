namespace Cohestra.Contracts.Activities;

/// <summary>
/// Activity registration form schema (v1). See docs/contracts/activity-form-schema-v1.md.
/// </summary>
public sealed record ActivityFormSchemaDto(
    int Version,
    IReadOnlyList<FormFieldDefinitionDto> Fields);

/// <summary>
/// Single field in an activity form schema. <c>type</c> must be one of the v1 field types documented in the contract.
/// </summary>
public sealed record FormFieldDefinitionDto(
    string Id,
    string Type,
    string Label,
    bool Required,
    string? Placeholder,
    IReadOnlyList<FormFieldOptionDto>? Options,
    string? ConsentText,
    string? PhoneCountry);

public sealed record FormFieldOptionDto(string Value, string Label);
