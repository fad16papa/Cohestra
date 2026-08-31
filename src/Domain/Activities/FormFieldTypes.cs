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
    public const string Number = "number";
    public const string Url = "url";
    public const string Time = "time";
    public const string Choice = "choice";
    public const string YesNo = "yes_no";
    public const string MultiChoice = "multi_choice";
    public const string Info = "info";
    public const string Country = "country";
    public const string Scale = "scale";
    public const string Emergency = "emergency";

    public static readonly HashSet<string> CorePlusOnly =
    [
        Scale,
        Emergency,
    ];

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
        Number,
        Url,
        Time,
        Choice,
        YesNo,
        MultiChoice,
        Info,
        Country,
        Scale,
        Emergency,
    ];

    public static readonly HashSet<string> NonInput =
    [
        SectionHeader,
        Info,
    ];
}
