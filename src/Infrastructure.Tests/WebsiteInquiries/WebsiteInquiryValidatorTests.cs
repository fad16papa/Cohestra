using Cohestra.Application.WebsiteInquiries;
using Cohestra.Infrastructure.WebsiteInquiries;

public sealed class WebsiteInquiryValidatorTests
{
    [Fact]
    public void Validate_RejectsEmptyName()
    {
        var error = WebsiteInquiryValidator.Validate(
            new SubmitWebsiteInquiryCommand("  ", "a@b.com", null, "Hello", false));

        Assert.Equal("Name is required.", error);
    }

    [Fact]
    public void Validate_RequiresEmailOrPhone()
    {
        var error = WebsiteInquiryValidator.Validate(
            new SubmitWebsiteInquiryCommand("Alex", null, null, "Hello", false));

        Assert.Equal("Provide an email address or phone number.", error);
    }

    [Fact]
    public void Validate_RejectsEmptyMessage()
    {
        var error = WebsiteInquiryValidator.Validate(
            new SubmitWebsiteInquiryCommand("Alex", "alex@example.com", null, "  ", false));

        Assert.Equal("Message is required.", error);
    }

    [Fact]
    public void Validate_AcceptsEmailOnly()
    {
        var error = WebsiteInquiryValidator.Validate(
            new SubmitWebsiteInquiryCommand("Alex", "alex@example.com", null, "Hello", true));

        Assert.Null(error);
    }

    [Fact]
    public void Validate_AcceptsSingaporePhone()
    {
        var error = WebsiteInquiryValidator.Validate(
            new SubmitWebsiteInquiryCommand("Alex", null, "91234567", "Hello", false));

        Assert.Null(error);
    }
}
