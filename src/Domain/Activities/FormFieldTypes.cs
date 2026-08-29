namespace Cohestra.Domain.Activities;

public static class FormFieldTypes
{
    public const string Text = "text";
    public const string Phone = "phone";
    public const string Email = "email";
    public const string Select = "select";
    public const string Checkbox = "checkbox";
    public const string Consent = "consent";
    public const string ReferralSource = "referral_source";
    public const string SectionHeader = "section_header";
    public const string Hidden = "hidden";
    public const string Textarea = "textarea";
    public const string Date = "date";

    public static readonly HashSet<string> All =
    [
        Text,
        Phone,
        Email,
        Select,
        Checkbox,
        Consent,
        ReferralSource,
        SectionHeader,
        Hidden,
        Textarea,
        Date,
    ];

    public static readonly HashSet<string> NonInput =
    [
        SectionHeader,
    ];
}
