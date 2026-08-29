using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class VisibleWhenEvaluatorTests
{
    [Fact]
    public void IsVisible_GuestName_HiddenWhenControllerIsNo()
    {
        var schema = GuestSchema();
        var guest = schema.Fields[1];

        Assert.False(VisibleWhenEvaluator.IsVisible(
            guest,
            schema,
            new Dictionary<string, object?> { ["bringing_guest"] = "no" }));
    }

    [Fact]
    public void IsVisible_GuestName_ShownWhenControllerIsYes()
    {
        var schema = GuestSchema();
        var guest = schema.Fields[1];

        Assert.True(VisibleWhenEvaluator.IsVisible(
            guest,
            schema,
            new Dictionary<string, object?> { ["bringing_guest"] = "yes" }));
    }

    [Fact]
    public void IsVisible_CheckboxTrue_MatchesEqualsYes()
    {
        var schema = GuestSchema();
        var guest = schema.Fields[1];

        Assert.True(VisibleWhenEvaluator.IsVisible(
            guest,
            schema,
            new Dictionary<string, object?> { ["bringing_guest"] = true }));
    }

    [Fact]
    public void ValidateGraph_RejectsCycle()
    {
        var schema = new ActivityFormSchema
        {
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "a",
                    Type = FormFieldTypes.Select,
                    Label = "A",
                    VisibleWhen = new FormFieldVisibleWhen { FieldId = "b", EqualsValue = "yes" },
                },
                new FormFieldDefinition
                {
                    Id = "b",
                    Type = FormFieldTypes.Select,
                    Label = "B",
                    VisibleWhen = new FormFieldVisibleWhen { FieldId = "a", EqualsValue = "yes" },
                },
            ],
        };

        var error = VisibleWhenEvaluator.ValidateGraph(schema);

        Assert.NotNull(error);
        Assert.Contains("cycle", error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void ValidateGraph_RejectsMissingTarget()
    {
        var schema = new ActivityFormSchema
        {
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "guest_name",
                    Type = FormFieldTypes.Text,
                    Label = "Guest",
                    VisibleWhen = new FormFieldVisibleWhen { FieldId = "missing", EqualsValue = "yes" },
                },
            ],
        };

        Assert.Contains("does not match", VisibleWhenEvaluator.ValidateGraph(schema), StringComparison.Ordinal);
    }

    [Fact]
    public void ValidateModel_AcceptsGuestRecipe()
    {
        Assert.Null(FormSchemaValidator.ValidateModel(GuestSchema()));
    }

    private static ActivityFormSchema GuestSchema() =>
        new()
        {
            Version = 1,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "bringing_guest",
                    Type = FormFieldTypes.Select,
                    Label = "Bringing a guest?",
                    Required = true,
                    Options =
                    [
                        new FormFieldOption { Value = "yes", Label = "Yes" },
                        new FormFieldOption { Value = "no", Label = "No" },
                    ],
                },
                new FormFieldDefinition
                {
                    Id = "guest_name",
                    Type = FormFieldTypes.Text,
                    Label = "Guest name",
                    Required = true,
                    VisibleWhen = new FormFieldVisibleWhen
                    {
                        FieldId = "bringing_guest",
                        EqualsValue = "yes",
                    },
                },
                new FormFieldDefinition
                {
                    Id = "email",
                    Type = FormFieldTypes.Email,
                    Label = "Email",
                    Required = true,
                },
            ],
        };
}
