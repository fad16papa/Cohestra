using System.Net;
using System.Text;
using Cohestra.Application.Email;

namespace Cohestra.Infrastructure.Email;

internal static class EmailBrandHeaderTemplate
{
    internal const string PrimaryColor = "#2d6a4f";
    internal const string BackgroundColor = "#fafaf8";
    internal const string TextColor = "#1a1714";
    internal const string MutedTextColor = "#6b6560";
    internal const string EmailBannerBackground = "#f3f5f7";
    internal const string EmailBannerBorder = "#e6e9ed";
    internal const string FooterBrandLine = "Cohestra by Creativorare";
    internal const string BrandName = "Cohestra";
    internal const string BrandTagline = "Community Platform";

    internal static (string? LogoUrl, EmailInlineAttachment? InlineAttachment) ResolveInlineLogo()
    {
        var inlineAttachment = PlatformBrandAssets.TryCreateInlineLogoAttachment();
        if (inlineAttachment is null)
        {
            return (null, null);
        }

        return ($"cid:{PlatformBrandAssets.LogoInlineContentId}", inlineAttachment);
    }

    internal static void AppendPlainTextHeader(StringBuilder builder, string contextLabel)
    {
        builder.AppendLine(BrandName);
        builder.AppendLine(BrandTagline);
        builder.AppendLine(contextLabel);
        builder.AppendLine(new string('=', BrandName.Length));
        builder.AppendLine();
    }

    internal static string BuildHtmlHeader(string? logoUrl, string contextLabel)
    {
        var logoBlock = string.IsNullOrWhiteSpace(logoUrl)
            ? string.Empty
            : $"""
              <img src="{EncodeAttribute(logoUrl)}" alt="Cohestra logo" width="56" style="display:block;width:56px;max-width:56px;height:auto;margin:0 auto 12px;" />
              """;

        return $"""
            {logoBlock}
            <p style="margin:0;font-size:18px;font-weight:700;line-height:1.2;color:{TextColor};">{BrandName}</p>
            <p style="margin:4px 0 0;font-size:13px;line-height:1.4;color:{MutedTextColor};">{BrandTagline}</p>
            <p style="margin:14px 0 0;font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:{PrimaryColor};">{Encode(contextLabel)}</p>
            """;
    }

    internal static string BuildHtmlFooter(int year, string footerNote)
    {
        return $"""
            <tr>
              <td style="padding:20px 28px 28px;border-top:1px solid #e8e4df;text-align:center;">
                <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:{TextColor};">{FooterBrandLine} © {year}</p>
                <p style="margin:0;font-size:12px;line-height:1.5;color:{MutedTextColor};">{Encode(footerNote)}</p>
              </td>
            </tr>
            """;
    }

    private static string Encode(string? value) =>
        WebUtility.HtmlEncode(value ?? string.Empty);

    private static string EncodeAttribute(string? value) =>
        WebUtility.HtmlEncode(value ?? string.Empty);
}
