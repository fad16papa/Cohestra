using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class FormSchemaPlanGateDomainTests
{
    [Fact]
    public void EnsureAllowed_BasicWithDomainComposition_Throws()
    {
        var schema = DomainSchema();

        var ex = Assert.Throws<FormSchemaPlanLockedException>(() =>
            FormSchemaPlanGate.EnsureAllowed(schema, TenantPlan.Basic));

        Assert.Contains("Activity and community", ex.Message, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Core or Pro", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData(TenantPlan.Core)]
    [InlineData(TenantPlan.Pro)]
    [InlineData(TenantPlan.Enterprise)]
    public void EnsureAllowed_CorePlusWithDomainComposition_Allows(TenantPlan plan)
    {
        FormSchemaPlanGate.EnsureAllowed(DomainSchema(), plan);
    }

    [Fact]
    public void CompositionUsesDomain_FindsNestedDomainInSection()
    {
        var schema = DomainSchema();
        Assert.True(FormSchemaPlanGate.CompositionUsesDomain(schema.Composition));
        Assert.False(FormSchemaPlanGate.CompositionUsesColumns(schema.Composition));
    }

    private static ActivityFormSchema DomainSchema() =>
        new()
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
                    Id = "sec",
                    Kind = FormCompositionKinds.Section,
                    Title = "About",
                    Children =
                    [
                        new FormCompositionNode
                        {
                            Id = "details",
                            Kind = FormCompositionKinds.Domain,
                            Domain = FormCompositionDomainTypes.ActivityDetails,
                        },
                        new FormCompositionNode
                        {
                            Id = "email-ref",
                            Kind = FormCompositionKinds.FieldRef,
                            FieldId = "email",
                        },
                    ],
                },
            ],
        };
}
