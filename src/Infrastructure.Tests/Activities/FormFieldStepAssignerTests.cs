using Cohestra.Domain.Activities;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class FormFieldStepAssignerTests
{
    [Fact]
    public void AutoBucket_NamePhoneEmail_Identity_Consent_Consent_ElseDetails()
    {
        Assert.Equal(
            FormFieldSteps.Identity,
            FormFieldStepAssigner.AutoBucket(new FormFieldDefinition
            {
                Id = "full_name",
                Type = FormFieldTypes.Text,
            }));
        Assert.Equal(
            FormFieldSteps.Identity,
            FormFieldStepAssigner.AutoBucket(new FormFieldDefinition
            {
                Id = "phone",
                Type = FormFieldTypes.Phone,
            }));
        Assert.Equal(
            FormFieldSteps.Consent,
            FormFieldStepAssigner.AutoBucket(new FormFieldDefinition
            {
                Id = "consent",
                Type = FormFieldTypes.Consent,
            }));
        Assert.Equal(
            FormFieldSteps.Details,
            FormFieldStepAssigner.AutoBucket(new FormFieldDefinition
            {
                Id = "notes",
                Type = FormFieldTypes.Text,
            }));
        Assert.Equal(
            FormFieldSteps.Identity,
            FormFieldStepAssigner.AutoBucket(new FormFieldDefinition
            {
                Id = "full_name",
                Type = FormFieldTypes.Textarea,
            }));
        Assert.Equal(
            FormFieldSteps.Details,
            FormFieldStepAssigner.AutoBucket(new FormFieldDefinition
            {
                Id = "preferred_date",
                Type = FormFieldTypes.Date,
            }));
    }

    [Fact]
    public void ApplyMissingBuckets_FillsOnlyWhenStepsEnabled()
    {
        var schema = new ActivityFormSchema
        {
            Meta = new FormSchemaMeta { SplitIntoSteps = true },
            Fields =
            [
                new FormFieldDefinition { Id = "email", Type = FormFieldTypes.Email },
                new FormFieldDefinition
                {
                    Id = "notes",
                    Type = FormFieldTypes.Text,
                    Step = FormFieldSteps.Identity,
                },
            ],
        };

        FormFieldStepAssigner.ApplyMissingBuckets(schema);

        Assert.Equal(FormFieldSteps.Identity, schema.Fields[0].Step);
        Assert.Equal(FormFieldSteps.Identity, schema.Fields[1].Step);
    }
}
