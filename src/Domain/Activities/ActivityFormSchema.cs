namespace Cohestra.Domain.Activities;

public sealed class ActivityFormSchema
{
    public int Version { get; set; } = 1;

    public FormSchemaMeta? Meta { get; set; }

    public List<FormFieldDefinition> Fields { get; set; } = [];
}

public sealed class FormSchemaMeta
{
    public string? IntroMarkdown { get; set; }
}

public sealed class FormFieldDefinition
{
    public string Id { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;

    public bool Required { get; set; }

    public string? Placeholder { get; set; }

    public List<FormFieldOption>? Options { get; set; }

    public string? ConsentText { get; set; }

    /// <summary>ISO 3166-1 alpha-2 country for phone fields (e.g. SG, PH).</summary>
    public string? PhoneCountry { get; set; }

    /// <summary>Hidden fields only. Used when the public link omits the matching query key.</summary>
    public string? DefaultValue { get; set; }
}

public sealed class FormFieldOption
{
    public string Value { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;
}
