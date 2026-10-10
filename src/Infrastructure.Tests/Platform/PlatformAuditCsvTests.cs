using Cohestra.Contracts.Platform;
using Cohestra.Infrastructure.Platform;

namespace Cohestra.Infrastructure.Tests.Platform;

public sealed class PlatformAuditCsvTests
{
    [Theory]
    [InlineData("=2+2", "'=2+2")]
    [InlineData("+SUM(A1)", "'+SUM(A1)")]
    [InlineData("-1+1", "'-1+1")]
    [InlineData("@cmd", "'@cmd")]
    [InlineData("\tformula", "'\tformula")]
    [InlineData("\n=2+2", "'\n=2+2")]
    [InlineData("normal", "normal")]
    [InlineData("", "")]
    public void SanitizeFormula_prefixes_spreadsheet_risk(string input, string expected)
    {
        Assert.Equal(expected, PlatformAuditCsv.SanitizeFormula(input));
    }

    [Fact]
    public void EscapeField_quotes_commas_quotes_and_newlines()
    {
        Assert.Equal("\"a,b\"", PlatformAuditCsv.EscapeField("a,b"));
        Assert.Equal("\"say \"\"hi\"\"\"", PlatformAuditCsv.EscapeField("say \"hi\""));
        Assert.Equal("\"line\r\nbreak\"", PlatformAuditCsv.EscapeField("line\r\nbreak"));
        Assert.Equal("\"ok;=cmd\"", PlatformAuditCsv.EscapeField("ok;=cmd"));
    }

    [Fact]
    public void WriteUtf8_omits_details_and_applies_formula_guard()
    {
        var csv = System.Text.Encoding.UTF8.GetString(PlatformAuditCsv.WriteUtf8(
        [
            new PlatformAuditEntryResponse(
                Guid.Parse("11111111-1111-1111-1111-111111111111"),
                Guid.Parse("22222222-2222-2222-2222-222222222222"),
                "Actor@Example.com",
                Guid.Parse("33333333-3333-3333-3333-333333333333"),
                "TenantSuspended",
                "=2+2",
                new DateTimeOffset(2026, 10, 10, 12, 0, 0, TimeSpan.Zero)),
        ]));

        Assert.StartsWith(PlatformAuditCsv.Header, csv, StringComparison.Ordinal);
        Assert.Contains("'=2+2", csv, StringComparison.Ordinal);
        Assert.DoesNotContain("detailsJson", csv, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("AUDIT_DETAILS", csv, StringComparison.Ordinal);
        Assert.Contains("Actor@Example.com", csv, StringComparison.Ordinal);
    }

    [Fact]
    public void FileNameUtc_is_not_user_controlled()
    {
        var name = PlatformAuditCsv.FileNameUtc(new DateTimeOffset(2026, 10, 10, 23, 0, 0, TimeSpan.Zero));
        Assert.Equal("cohestra-platform-audits-20261010.csv", name);
        Assert.DoesNotContain("/", name, StringComparison.Ordinal);
        Assert.DoesNotContain("\\", name, StringComparison.Ordinal);
        Assert.DoesNotContain("..", name, StringComparison.Ordinal);
    }
}
