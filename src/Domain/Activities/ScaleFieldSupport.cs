namespace Cohestra.Domain.Activities;

public static class ScaleFieldSupport
{
    public static readonly string[] Values = ["1", "2", "3", "4", "5"];

    private static readonly Dictionary<string, string> Labels = new(StringComparer.Ordinal)
    {
        ["1"] = "Beginner",
        ["2"] = "Getting started",
        ["3"] = "Intermediate",
        ["4"] = "Advanced",
        ["5"] = "Expert",
    };

    public static bool IsValidValue(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        return Values.Contains(value.Trim(), StringComparer.Ordinal);
    }

    public static string? GetLabel(string value) =>
        Labels.TryGetValue(value.Trim(), out var label) ? label : null;
}
