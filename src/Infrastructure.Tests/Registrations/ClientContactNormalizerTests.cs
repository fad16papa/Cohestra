using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Tests.Registrations;

/// <summary>
/// ATDD red-phase matrix for Story 3.3 — E.164 phone normalization (+63 default).
/// </summary>
public sealed class ClientContactNormalizerTests
{
    [Theory]
    [InlineData("09171234567", "PH", "+639171234567")]
    [InlineData("9171234567", "PH", "+639171234567")]
    [InlineData("639171234567", "PH", "+639171234567")]
    [InlineData("+639171234567", "PH", "+639171234567")]
    [InlineData(" +63 917 123 4567 ", "PH", "+639171234567")]
    public void NormalizePhone_AppliesPhilippinesCountry(string input, string isoCountry, string expected)
    {
        var normalized = ClientContactNormalizer.NormalizePhone(input, isoCountry);

        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData("81234567", "+6581234567")]
    [InlineData("91234567", "+6591234567")]
    [InlineData("+65 8123 4567", "+6581234567")]
    public void NormalizePhone_DefaultsToSingaporeWhenCountryOmitted(string input, string expected)
    {
        var normalized = ClientContactNormalizer.NormalizePhone(input);

        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData("81234567", "SG", "+6581234567")]
    [InlineData("91234567", "SG", "+6591234567")]
    [InlineData("+65 8123 4567", "SG", "+6581234567")]
    [InlineData("6581234567", "SG", "+6581234567")]
    public void NormalizePhone_AppliesSingaporeCountryFromSchema(
        string input,
        string isoCountry,
        string expected)
    {
        var normalized = ClientContactNormalizer.NormalizePhone(input, isoCountry);

        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("abc")]
    public void NormalizePhone_ReturnsNullForMissingOrInvalidInput(string? input)
    {
        Assert.Null(ClientContactNormalizer.NormalizePhone(input));
    }

    [Theory]
    [InlineData("Elena@Example.COM", "elena@example.com")]
    [InlineData("  user@domain.com  ", "user@domain.com")]
    public void NormalizeEmail_LowercasesAndTrims(string input, string expected)
    {
        Assert.Equal(expected, ClientContactNormalizer.NormalizeEmail(input));
    }
}
