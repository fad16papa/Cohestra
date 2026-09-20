using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class FormSchemaPlanGateColumnsTests
{
    [Fact]
    public void EnsureAllowed_BasicWithColumnsComposition_Throws()
    {
        var schema = new ActivityFormSchema
        {
            Version = 2,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "email",
                    Type = FormFieldTypes.Email,
                    Label = "Email",
                    Required = true,
                },
            ],
            Composition =
            [
                new FormCompositionNode
                {
                    Id = "cols",
                    Kind = FormCompositionKinds.Columns,
                    Columns =
                    [
                        [
                            new FormCompositionNode
                            {
                                Id = "left",
                                Kind = FormCompositionKinds.FieldRef,
                                FieldId = "email",
                            },
                        ],
                        [
                            new FormCompositionNode
                            {
                                Id = "right",
                                Kind = FormCompositionKinds.Content,
                                ContentType = FormCompositionContentTypes.Paragraph,
                                Content = new FormCompositionContentProps { Text = "Note" },
                            },
                        ],
                    ],
                },
            ],
        };

        var ex = Assert.Throws<FormSchemaPlanLockedException>(() =>
            FormSchemaPlanGate.EnsureAllowed(schema, TenantPlan.Basic));

        Assert.Contains("Two-column", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Core or Pro", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void EnsureAllowed_CoreWithColumnsComposition_Allows()
    {
        var schema = new ActivityFormSchema
        {
            Version = 2,
            Fields =
            [
                new FormFieldDefinition
                {
                    Id = "email",
                    Type = FormFieldTypes.Email,
                    Label = "Email",
                    Required = true,
                },
            ],
            Composition =
            [
                new FormCompositionNode
                {
                    Id = "cols",
                    Kind = FormCompositionKinds.Columns,
                    Columns =
                    [
                        [
                            new FormCompositionNode
                            {
                                Id = "left",
                                Kind = FormCompositionKinds.FieldRef,
                                FieldId = "email",
                            },
                        ],
                        [
                            new FormCompositionNode
                            {
                                Id = "right",
                                Kind = FormCompositionKinds.Content,
                                ContentType = FormCompositionContentTypes.Paragraph,
                                Content = new FormCompositionContentProps { Text = "Note" },
                            },
                        ],
                    ],
                },
            ],
        };

        FormSchemaPlanGate.EnsureAllowed(schema, TenantPlan.Core);
    }
}
