namespace Cohestra.Infrastructure.Activities;

internal static class ActivityBrandingContrastValidator
{
    public static string? ValidateAccentContrastForWhiteText(string? accentColor)
    {
        if (string.IsNullOrWhiteSpace(accentColor))
        {
            return null;
        }

        if (!TryParseHex(accentColor.Trim(), out var accentRgb))
        {
            return null;
        }

        var white = (R: 255, G: 255, B: 255);
        var ratio = ContrastRatio(accentRgb, white);
        if (ratio < 4.5)
        {
            return "Accent color contrast is too low for accessible button text. Choose a darker or richer color.";
        }

        return null;
    }

    private static bool TryParseHex(string hex, out (int R, int G, int B) rgb)
    {
        rgb = default;
        if (hex.Length != 7 || hex[0] != '#')
        {
            return false;
        }

        if (!int.TryParse(hex[1..], System.Globalization.NumberStyles.HexNumber, null, out var value))
        {
            return false;
        }

        rgb = ((value >> 16) & 0xFF, (value >> 8) & 0xFF, value & 0xFF);
        return true;
    }

    private static double ContrastRatio((int R, int G, int B) a, (int R, int G, int B) b)
    {
        var l1 = RelativeLuminance(a);
        var l2 = RelativeLuminance(b);
        var lighter = Math.Max(l1, l2);
        var darker = Math.Min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
    }

    private static double RelativeLuminance((int R, int G, int B) rgb)
    {
        static double Channel(int value)
        {
            var s = value / 255d;
            return s <= 0.03928 ? s / 12.92 : Math.Pow((s + 0.055) / 1.055, 2.4);
        }

        return 0.2126 * Channel(rgb.R) + 0.7152 * Channel(rgb.G) + 0.0722 * Channel(rgb.B);
    }
}
