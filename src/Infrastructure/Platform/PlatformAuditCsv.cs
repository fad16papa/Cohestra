using System.Globalization;
using System.Text;
using Cohestra.Contracts.Platform;

namespace Cohestra.Infrastructure.Platform;

public static class PlatformAuditCsv
{
    public const string Header = "id,actorUserId,actorEmail,tenantId,action,reason,createdAt";

    public static string FileNameUtc(DateTimeOffset observedAt) =>
        $"cohestra-platform-audits-{observedAt.UtcDateTime:yyyyMMdd}.csv";

    public static string SanitizeFormula(string? value)
    {
        if (string.IsNullOrEmpty(value))
        {
            return value ?? string.Empty;
        }

        var first = value[0];
        if (first is '=' or '+' or '-' or '@' or '\t' or '\r')
        {
            return "'" + value;
        }

        return value;
    }

    public static string EscapeField(string? value)
    {
        var text = value ?? string.Empty;
        if (text.Contains('"') || text.Contains(',') || text.Contains('\n') || text.Contains('\r'))
        {
            return "\"" + text.Replace("\"", "\"\"", StringComparison.Ordinal) + "\"";
        }

        return text;
    }

    public static string Field(string? value) => EscapeField(SanitizeFormula(value));

    public static byte[] WriteUtf8(IReadOnlyList<PlatformAuditEntryResponse> rows)
    {
        var builder = new StringBuilder();
        builder.Append(Header);
        builder.Append("\r\n");
        foreach (var row in rows)
        {
            builder.Append(Field(row.Id.ToString()));
            builder.Append(',');
            builder.Append(Field(row.ActorUserId.ToString()));
            builder.Append(',');
            builder.Append(Field(row.ActorEmail));
            builder.Append(',');
            builder.Append(Field(row.TenantId.ToString()));
            builder.Append(',');
            builder.Append(Field(row.Action));
            builder.Append(',');
            builder.Append(Field(row.Reason));
            builder.Append(',');
            builder.Append(Field(row.CreatedAt.ToUniversalTime().ToString("O", CultureInfo.InvariantCulture)));
            builder.Append("\r\n");
        }

        return Encoding.UTF8.GetBytes(builder.ToString());
    }
}
