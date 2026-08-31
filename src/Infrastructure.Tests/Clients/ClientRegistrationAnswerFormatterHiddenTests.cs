using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Clients;

namespace Cohestra.Infrastructure.Tests.Clients;

public sealed class ClientRegistrationAnswerFormatterHiddenTests
{
    [Fact]
    public void FormatAnswers_IncludesHiddenValue()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "ref",
                    Type = FormFieldTypes.Hidden,
                    Label = "Campaign ref",
                },
            ],
        };

        var answers = ClientRegistrationAnswerFormatter.FormatAnswers(
            schema,
            new Dictionary<string, object?> { ["ref"] = "wa" });

        var hidden = Assert.Single(answers);
        Assert.Equal("ref", hidden.FieldId);
        Assert.Equal("Campaign ref", hidden.Label);
        Assert.Equal("wa", hidden.Value);
    }

    [Fact]
    public void FormatAnswers_IncludesTextareaAndDateValues()
    {
        var schema = new ActivityFormSchema
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "notes",
                    Type = FormFieldTypes.Textarea,
                    Label = "Notes",
                },
                new FormFieldDefinition
                {
                    Id = "preferred_date",
                    Type = FormFieldTypes.Date,
                    Label = "Preferred date",
                },
            ],
        };

        var answers = ClientRegistrationAnswerFormatter.FormatAnswers(
            schema,
            new Dictionary<string, object?>
            {
                ["notes"] = "Prefers Saturday mornings",
                ["preferred_date"] = "2026-09-12",
            });

        Assert.Equal("Prefers Saturday mornings", answers.Single(item => item.FieldId == "notes").Value);
        Assert.Equal("2026-09-12", answers.Single(item => item.FieldId == "preferred_date").Value);
    }
}
