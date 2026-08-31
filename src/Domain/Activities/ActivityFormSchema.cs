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

    /// <summary>Pro-only. When false (default), the public Form is a single page.</summary>
    public bool SplitIntoSteps { get; set; }

    /// <summary>Operator thank-you copy with piping tokens. Participant-visible only.</summary>
    public string? SuccessCopyMarkdown { get; set; }

    /// <summary>Confirmation email subject with piping tokens. Layout unchanged.</summary>
    public string? ConfirmationEmailSubject { get; set; }

    /// <summary>Confirmation email body message with piping tokens. Layout unchanged.</summary>
    public string? ConfirmationEmailBodyMarkdown { get; set; }

    /// <summary>Operator copy when the public Form is unavailable. Markdown-lite, max 2000.</summary>
    public string? ClosedMessage { get; set; }

    /// <summary>Optional UTC instant after which public registration closes.</summary>
    public DateTimeOffset? RegistrationClosesAt { get; set; }
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

    /// <summary>Core+ Recipe. Show this Field only when another Field matches.</summary>
    public FormFieldVisibleWhen? VisibleWhen { get; set; }

    /// <summary>Pro steps bucket: identity, details, or consent. Ignored unless meta.splitIntoSteps.</summary>
    public string? Step { get; set; }

    /// <summary>Hidden fields only. Used when the public link omits the matching query key.</summary>
    public string? DefaultValue { get; set; }

    /// <summary>Number value bound or multi_choice selection count. Inclusive.</summary>
    public decimal? Min { get; set; }

    /// <summary>Number value bound or multi_choice selection count. Inclusive.</summary>
    public decimal? Max { get; set; }

    /// <summary>Info fields only. Markdown-lite body, max 2000 after HTML strip.</summary>
    public string? InfoText { get; set; }
}

public sealed class FormFieldVisibleWhen
{
    public string FieldId { get; set; } = string.Empty;

    /// <summary>JSON <c>equals</c>. Mutually exclusive with <see cref="NotEqualsValue"/>.</summary>
    [System.Text.Json.Serialization.JsonPropertyName("equals")]
    public string? EqualsValue { get; set; }

    /// <summary>JSON <c>notEquals</c>.</summary>
    [System.Text.Json.Serialization.JsonPropertyName("notEquals")]
    public string? NotEqualsValue { get; set; }
}

public sealed class FormFieldOption
{
    public string Value { get; set; } = string.Empty;

    public string Label { get; set; } = string.Empty;
}
