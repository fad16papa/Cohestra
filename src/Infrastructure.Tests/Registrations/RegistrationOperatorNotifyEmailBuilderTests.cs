using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Registrations;

namespace Cohestra.Infrastructure.Tests.Registrations;

public sealed class RegistrationOperatorNotifyEmailBuilderTests
{
    private static RegistrationOperatorNotifyEmailModel CreateModel(
        IReadOnlyList<(string Label, string Value)>? hiddenAnswers = null) =>
        new(
            ActivityName: "Sunday Pickleball Clinic",
            ParticipantName: "Elena Santos",
            Phone: "+6591234567",
            Email: "elena@example.com",
            RegistrationNumber: "REG20260616000042",
            RegistrationsUrl: "http://ikigai.localhost:3000/activities/abc?tab=registrations",
            HiddenAnswers: hiddenAnswers ?? []);

    [Fact]
    public void Build_IncludesActivityTitleAndParticipantInSubject()
    {
        var content = RegistrationOperatorNotifyEmailBuilder.Build(CreateModel());

        Assert.Equal(
            "New registration — Sunday Pickleball Clinic — Elena Santos",
            content.Subject);
    }

    [Fact]
    public void Build_UsesPhoneInSubjectWhenNameMissing()
    {
        var content = RegistrationOperatorNotifyEmailBuilder.Build(
            CreateModel() with { ParticipantName = string.Empty });

        Assert.Equal(
            "New registration — Sunday Pickleball Clinic — +6591234567",
            content.Subject);
    }

    [Fact]
    public void Build_IncludesContactDetailsAndRegistrationsLink()
    {
        var content = RegistrationOperatorNotifyEmailBuilder.Build(CreateModel());

        Assert.Contains("Elena Santos", content.PlainBody);
        Assert.Contains("+6591234567", content.PlainBody);
        Assert.Contains("elena@example.com", content.PlainBody);
        Assert.Contains("REG20260616000042", content.PlainBody);
        Assert.Contains("http://ikigai.localhost:3000/activities/abc?tab=registrations", content.PlainBody);
        Assert.Contains("View registrations", content.HtmlBody);
    }

    [Fact]
    public void Build_IncludesHiddenAnswersWhenPresent()
    {
        var content = RegistrationOperatorNotifyEmailBuilder.Build(
            CreateModel([("utm_source", "whatsapp"), ("utm_campaign", "aug-open")]));

        Assert.Contains("Campaign / hidden fields", content.PlainBody);
        Assert.Contains("utm_source: whatsapp", content.PlainBody);
        Assert.Contains("utm_campaign", content.HtmlBody);
        Assert.Contains("aug-open", content.HtmlBody);
    }

    [Fact]
    public void BuildHiddenAnswers_IncludesOnlyHiddenFieldsWithValues()
    {
        var schema = new ActivityFormSchema
        {
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "full_name",
                    Label = "Full name",
                    Type = FormFieldTypes.Text,
                },
                new FormFieldDefinition
                {
                    Id = "utm_source",
                    Label = "UTM Source",
                    Type = FormFieldTypes.Hidden,
                },
                new FormFieldDefinition
                {
                    Id = "utm_medium",
                    Label = "UTM Medium",
                    Type = FormFieldTypes.Hidden,
                },
            ],
        };

        var answers = new Dictionary<string, object?>
        {
            ["full_name"] = "Elena Santos",
            ["utm_source"] = "whatsapp",
            ["utm_medium"] = string.Empty,
        };

        var hidden = RegistrationOperatorNotifyEmailBuilder.BuildHiddenAnswers(schema, answers);

        Assert.Single(hidden);
        Assert.Equal(("UTM Source", "whatsapp"), hidden[0]);
    }
}
