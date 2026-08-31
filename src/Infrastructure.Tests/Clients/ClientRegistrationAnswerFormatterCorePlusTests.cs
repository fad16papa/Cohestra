using System.Text.Json;
using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Clients;

namespace Cohestra.Infrastructure.Tests.Clients;

public sealed class ClientRegistrationAnswerFormatterCorePlusTests
{
    [Fact]
    public void FormatAnswers_IncludesLabeledScaleValue()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "skill",
                    Type = FormFieldTypes.Scale,
                    Label = "Skill level",
                },
            ],
        };

        var answers = ClientRegistrationAnswerFormatter.FormatAnswers(
            schema,
            new Dictionary<string, object?> { ["skill"] = "3" });

        var scale = Assert.Single(answers);
        Assert.Equal("skill", scale.FieldId);
        Assert.Equal("Skill level", scale.Label);
        Assert.Equal("3 — Intermediate", scale.Value);
    }

    [Fact]
    public void FormatAnswers_IncludesEmergencyNameAndPhone()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "emergency_contact",
                    Type = FormFieldTypes.Emergency,
                    Label = "Emergency contact",
                    PhoneCountry = "SG",
                },
            ],
        };

        var answers = ClientRegistrationAnswerFormatter.FormatAnswers(
            schema,
            new Dictionary<string, object?>
            {
                ["emergency_contact"] = new Dictionary<string, object?>
                {
                    ["name"] = "Alex",
                    ["phone"] = "91234567",
                },
            });

        var emergency = Assert.Single(answers);
        Assert.Equal("emergency_contact", emergency.FieldId);
        Assert.Equal("Emergency contact", emergency.Label);
        Assert.Equal("Alex — 91234567", emergency.Value);
    }

    [Fact]
    public void FormatAnswers_IncludesEmergencyFromJsonElement()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "emergency_contact",
                    Type = FormFieldTypes.Emergency,
                    Label = "Emergency contact",
                },
            ],
        };

        using var json = JsonDocument.Parse("""{"name":"Alex","phone":"91234567"}""");
        var answers = ClientRegistrationAnswerFormatter.FormatAnswers(
            schema,
            new Dictionary<string, object?> { ["emergency_contact"] = json.RootElement.Clone() });

        var emergency = Assert.Single(answers);
        Assert.Equal("Alex — 91234567", emergency.Value);
    }
}
