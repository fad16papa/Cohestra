using System.Text.RegularExpressions;
using Ganss.Xss;

namespace LeadGenerationCrm.Infrastructure.Campaigns;

public sealed record ProcessedCampaignBody(
    string StoredBody,
    string PlainTextBody,
    string? HtmlBody,
    Domain.Campaigns.CampaignBodyFormat BodyFormat);

public static class CampaignEmailBodyProcessor
{
    public const int MaxPlainBodyLength = 8000;
    public const int MaxHtmlBodyBytes = 102_400;
    private const int MaxImageCount = 20;

    private static readonly HtmlSanitizer Sanitizer = CreateSanitizer();
    private static readonly Regex ImageSrcRegex = new(
        "<img\\b[^>]*\\bsrc\\s*=\\s*[\"']([^\"']+)[\"']",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static ProcessedCampaignBody Process(string body, string? bodyFormat)
    {
        var trimmed = body?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(trimmed))
        {
            throw new ArgumentException("Campaign body is required.");
        }

        if (IsHtmlFormat(bodyFormat))
        {
            var sanitized = SanitizeHtml(trimmed);
            ValidateHtml(sanitized);

            return new ProcessedCampaignBody(
                sanitized,
                HtmlToPlainText(sanitized),
                sanitized,
                Domain.Campaigns.CampaignBodyFormat.Html);
        }

        if (trimmed.Length > MaxPlainBodyLength)
        {
            throw new ArgumentException(
                $"Campaign body must be {MaxPlainBodyLength} characters or fewer.");
        }

        return new ProcessedCampaignBody(
            trimmed,
            trimmed,
            null,
            Domain.Campaigns.CampaignBodyFormat.Plain);
    }

    public static bool IsHtmlFormat(string? bodyFormat) =>
        string.Equals(bodyFormat?.Trim(), "html", StringComparison.OrdinalIgnoreCase);

    public static string SanitizeHtml(string html)
    {
        var sanitized = Sanitizer.Sanitize(html).Trim();

        if (string.IsNullOrWhiteSpace(sanitized))
        {
            throw new ArgumentException("Email body cannot be empty after sanitization.");
        }

        return sanitized;
    }

    public static string HtmlToPlainText(string html)
    {
        var withBreaks = Regex.Replace(html, @"<br\s*/?>", "\n", RegexOptions.IgnoreCase);
        withBreaks = Regex.Replace(withBreaks, @"</p>", "\n\n", RegexOptions.IgnoreCase);
        withBreaks = Regex.Replace(withBreaks, @"</li>", "\n", RegexOptions.IgnoreCase);
        var stripped = Regex.Replace(withBreaks, "<[^>]+>", string.Empty);
        return System.Net.WebUtility.HtmlDecode(stripped).Trim();
    }

    public static void ValidateImageSources(string html)
    {
        foreach (Match match in ImageSrcRegex.Matches(html))
        {
            var src = match.Groups[1].Value;
            if (!IsAllowedImageSrc(src))
            {
                throw new ArgumentException(
                    "Images must be uploaded through the campaign composer or inserted from activity QR codes.");
            }
        }
    }

    internal static bool IsAllowedImageSrc(string? src)
    {
        if (string.IsNullOrWhiteSpace(src) ||
            !Uri.TryCreate(src, UriKind.Absolute, out var uri))
        {
            return false;
        }

        if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
        {
            return false;
        }

        return uri.AbsolutePath.Contains(
            "/api/v1/public/campaign-assets/",
            StringComparison.OrdinalIgnoreCase);
    }

    private static void ValidateHtml(string html)
    {
        if (System.Text.Encoding.UTF8.GetByteCount(html) > MaxHtmlBodyBytes)
        {
            throw new ArgumentException(
                $"HTML email body must be {MaxHtmlBodyBytes / 1024}KB or smaller.");
        }

        var imageCount = Regex.Matches(html, "<img\\b", RegexOptions.IgnoreCase).Count;
        if (imageCount > MaxImageCount)
        {
            throw new ArgumentException($"Email body can include at most {MaxImageCount} images.");
        }
    }

    private static HtmlSanitizer CreateSanitizer()
    {
        var sanitizer = new HtmlSanitizer();
        sanitizer.AllowedTags.Clear();
        sanitizer.AllowedTags.UnionWith(
        [
            "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "a", "img", "div", "span",
        ]);
        sanitizer.AllowedAttributes.Clear();
        sanitizer.AllowedAttributes.UnionWith(["href", "src", "alt", "title", "target", "rel"]);
        sanitizer.AllowedSchemes.Clear();
        sanitizer.AllowedSchemes.UnionWith(["http", "https", "mailto"]);
        sanitizer.AllowedCssProperties.Clear();
        return sanitizer;
    }
}
