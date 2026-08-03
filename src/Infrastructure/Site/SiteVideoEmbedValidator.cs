using System.Text.Json;
using System.Text.RegularExpressions;
using Cohestra.Contracts.Site;
using Cohestra.Domain.Site;

namespace Cohestra.Infrastructure.Site;

/// <summary>
/// Parses and validates YouTube / Vimeo embed URLs for Site Page video sections.
/// </summary>
public static partial class SiteVideoEmbedValidator
{
    public sealed record VideoEmbedInfo(
        string Source,
        string VideoId,
        string VideoUrl,
        string EmbedUrl);

    public static string? ValidateDocumentDto(SiteSectionsDocumentDto dto)
    {
        foreach (var section in dto.Sections)
        {
            if (!string.Equals(section.Type, "video", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var error = ValidateSectionProps(section.Props, requireVideo: false);
            if (error is not null)
            {
                return error;
            }
        }

        return null;
    }

    private static string? TryGetQueryParam(Uri uri, string key)
    {
        var query = uri.Query;
        if (string.IsNullOrEmpty(query))
        {
            return null;
        }

        foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var segments = part.Split('=', 2);
            if (segments.Length != 2)
            {
                continue;
            }

            if (!string.Equals(Uri.UnescapeDataString(segments[0]), key, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            return Uri.UnescapeDataString(segments[1]);
        }

        return null;
    }

    public static string? ValidateDocument(SiteSectionsDocument document)
    {
        foreach (var section in document.Sections)
        {
            if (!string.Equals(section.Type, "video", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            var error = ValidateSectionProps(section.Props, requireVideo: false);
            if (error is not null)
            {
                return error;
            }
        }

        return null;
    }

    public static string? ValidateSectionPropsForPublish(JsonElement props) =>
        ValidateSectionProps(props, requireVideo: true);

    public static string? ValidateSectionProps(JsonElement props, bool requireVideo)
    {
        if (props.ValueKind != JsonValueKind.Object)
        {
            return requireVideo
                ? "video: paste a YouTube or Vimeo link."
                : null;
        }

        if (!props.TryGetProperty("videoUrl", out var urlElement) ||
            urlElement.ValueKind != JsonValueKind.String)
        {
            return requireVideo
                ? "video: paste a YouTube or Vimeo link."
                : null;
        }

        var videoUrl = urlElement.GetString()?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(videoUrl))
        {
            return requireVideo
                ? "video: paste a YouTube or Vimeo link."
                : null;
        }

        return TryParse(videoUrl, out _, out var error) ? null : error;
    }

    public static bool TryParse(
        string videoUrl,
        out VideoEmbedInfo? info,
        out string? error)
    {
        info = null;
        error = null;

        if (string.IsNullOrWhiteSpace(videoUrl))
        {
            error = "Video URL is required.";
            return false;
        }

        if (!Uri.TryCreate(videoUrl.Trim(), UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps)
        {
            error = "Video URL must be a valid HTTPS link.";
            return false;
        }

        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal))
        {
            host = host[4..];
        }

        if (IsYouTubeHost(host))
        {
            return TryParseYouTube(uri, out info, out error);
        }

        if (IsVimeoHost(host))
        {
            return TryParseVimeo(uri, out info, out error);
        }

        error = "Only YouTube and Vimeo links are supported.";
        return false;
    }

    public static JsonElement NormalizeSectionProps(JsonElement props)
    {
        if (props.ValueKind != JsonValueKind.Object ||
            !props.TryGetProperty("videoUrl", out var urlElement) ||
            urlElement.ValueKind != JsonValueKind.String)
        {
            return props;
        }

        var videoUrl = urlElement.GetString()?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(videoUrl) ||
            !TryParse(videoUrl, out var parsed, out _) ||
            parsed is null)
        {
            return props;
        }

        var dict = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
            props.GetRawText(),
            SiteSectionsDocumentJson.SerializerOptions)
            ?? new Dictionary<string, JsonElement>();

        dict["source"] = JsonSerializer.SerializeToElement(parsed.Source);
        dict["videoId"] = JsonSerializer.SerializeToElement(parsed.VideoId);
        dict["videoUrl"] = JsonSerializer.SerializeToElement(parsed.VideoUrl);
        dict["embedUrl"] = JsonSerializer.SerializeToElement(parsed.EmbedUrl);
        if (!dict.ContainsKey("aspectRatio"))
        {
            dict["aspectRatio"] = JsonSerializer.SerializeToElement("16:9");
        }

        return JsonSerializer.SerializeToElement(dict, SiteSectionsDocumentJson.SerializerOptions);
    }

    private static bool TryParseYouTube(Uri uri, out VideoEmbedInfo? info, out string? error)
    {
        info = null;
        error = null;

        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal))
        {
            host = host[4..];
        }

        string? videoId = null;

        if (host is "youtu.be")
        {
            videoId = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
        }
        else if (host is "youtube.com" or "youtube-nocookie.com")
        {
            if (uri.AbsolutePath.StartsWith("/embed/", StringComparison.OrdinalIgnoreCase))
            {
                videoId = uri.AbsolutePath["/embed/".Length..].Trim('/');
            }
            else if (uri.AbsolutePath.Equals("/watch", StringComparison.OrdinalIgnoreCase))
            {
                videoId = TryGetQueryParam(uri, "v");
            }
            else if (uri.AbsolutePath.StartsWith("/shorts/", StringComparison.OrdinalIgnoreCase))
            {
                videoId = uri.AbsolutePath["/shorts/".Length..].Trim('/');
            }
        }

        if (string.IsNullOrWhiteSpace(videoId) || !YouTubeVideoIdRegex().IsMatch(videoId))
        {
            error = "Could not read a YouTube video ID from that link.";
            return false;
        }

        var canonicalUrl = $"https://www.youtube.com/watch?v={videoId}";
        var embedUrl = $"https://www.youtube-nocookie.com/embed/{videoId}";

        info = new VideoEmbedInfo("youtube", videoId, canonicalUrl, embedUrl);
        return true;
    }

    private static bool TryParseVimeo(Uri uri, out VideoEmbedInfo? info, out string? error)
    {
        info = null;
        error = null;

        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal))
        {
            host = host[4..];
        }

        string? videoId = null;

        if (host is "vimeo.com")
        {
            var segment = uri.AbsolutePath.Trim('/').Split('/', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault();
            if (segment is not null && VimeoVideoIdRegex().IsMatch(segment))
            {
                videoId = segment;
            }
        }
        else if (host is "player.vimeo.com" &&
                 uri.AbsolutePath.StartsWith("/video/", StringComparison.OrdinalIgnoreCase))
        {
            videoId = uri.AbsolutePath["/video/".Length..].Trim('/');
        }

        if (string.IsNullOrWhiteSpace(videoId) || !VimeoVideoIdRegex().IsMatch(videoId))
        {
            error = "Could not read a Vimeo video ID from that link.";
            return false;
        }

        var canonicalUrl = $"https://vimeo.com/{videoId}";
        var embedUrl = $"https://player.vimeo.com/video/{videoId}";

        info = new VideoEmbedInfo("vimeo", videoId, canonicalUrl, embedUrl);
        return true;
    }

    private static bool IsYouTubeHost(string host) =>
        host is "youtube.com" or "youtu.be" or "youtube-nocookie.com";

    private static bool IsVimeoHost(string host) =>
        host is "vimeo.com" or "player.vimeo.com";

    [GeneratedRegex("^[\\w-]{11}$", RegexOptions.CultureInvariant)]
    private static partial Regex YouTubeVideoIdRegex();

    [GeneratedRegex("^[0-9]+$", RegexOptions.CultureInvariant)]
    private static partial Regex VimeoVideoIdRegex();
}
