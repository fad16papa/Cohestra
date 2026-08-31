namespace Cohestra.Domain.Activities;

public static class FormFieldSteps
{
    public const string Identity = "identity";
    public const string Details = "details";
    public const string Consent = "consent";

    public static readonly HashSet<string> All =
    [
        Identity,
        Details,
        Consent,
    ];
}
