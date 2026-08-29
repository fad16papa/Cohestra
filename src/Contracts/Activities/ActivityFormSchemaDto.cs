namespace Cohestra.Contracts.Activities;

/// <summary>
/// Activity registration form schema (v1). See docs/contracts/activity-form-schema-v1.md.
/// </summary>
public sealed record FormSchemaMetaDto(string? IntroMarkdown, bool SplitIntoSteps = false);

public sealed record ActivityFormSchemaDto(
    int Version,
    IReadOnlyList<FormFieldDefinitionDto> Fields,
    FormSchemaMetaDto? Meta = null);

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
    string? PhoneCountry,
    FormFieldVisibleWhenDto? VisibleWhen = null,
    string? Step = null,
    string? DefaultValue = null);

/// <summary>
/// Recipe: show the Field when another Field equals or not-equals a value. Nested AND/OR is not supported.
/// </summary>
public sealed record FormFieldVisibleWhenDto(
    string FieldId,
    [property: System.Text.Json.Serialization.JsonPropertyName("equals")] string? EqualsValue,
    [property: System.Text.Json.Serialization.JsonPropertyName("notEquals")] string? NotEqualsValue);

public sealed record FormFieldOptionDto(string Value, string Label);
