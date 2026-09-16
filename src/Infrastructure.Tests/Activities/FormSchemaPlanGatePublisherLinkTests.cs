using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Activities;

namespace Cohestra.Infrastructure.Tests.Activities;

public sealed class FormSchemaPlanGatePublisherLinkTests
{
    [Fact]
    public void EnsureAllowed_BasicWithPublisherLinkEnabled_Throws()
    {
        var schema = new ActivityFormSchema
        {
            Meta = new FormSchemaMeta { ShowPublisherWebsiteLink = true },
            Fields = [],
        };

        var ex = Assert.Throws<FormSchemaPlanLockedException>(() =>
            FormSchemaPlanGate.EnsureAllowed(schema, TenantPlan.Basic));

        Assert.Contains("Core or Pro", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void NormalizePublisherWebsiteLink_Basic_ClearsFlag()
    {
        var schema = new ActivityFormSchema
        {
            Meta = new FormSchemaMeta { ShowPublisherWebsiteLink = true },
            Fields = [],
        };

        FormSchemaPlanGate.NormalizePublisherWebsiteLink(schema, TenantPlan.Basic);

        Assert.Null(schema.Meta!.ShowPublisherWebsiteLink);
    }

    [Fact]
    public void NormalizePublisherWebsiteLink_Core_PreservesFalse()
    {
        var schema = new ActivityFormSchema
        {
            Meta = new FormSchemaMeta { ShowPublisherWebsiteLink = false },
            Fields = [],
        };

        FormSchemaPlanGate.NormalizePublisherWebsiteLink(schema, TenantPlan.Core);

        Assert.False(schema.Meta!.ShowPublisherWebsiteLink);
    }
}
