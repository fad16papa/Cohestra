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
}
