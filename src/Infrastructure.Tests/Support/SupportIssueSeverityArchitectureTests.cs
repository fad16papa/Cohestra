using System.Reflection;
using Cohestra.Domain.Support;

namespace Cohestra.Infrastructure.Tests.Support;

public sealed class SupportIssueSeverityArchitectureTests
{
    [Fact]
    public void SupportIssue_defaults_to_unspecified_and_has_no_priority_or_incident()
    {
        var issue = new SupportIssue();
        Assert.Equal(SupportIssueSeverity.Unspecified, issue.Severity);
        Assert.Null(typeof(SupportIssue).GetProperty("Priority"));

        var domain = typeof(SupportIssue).Assembly;
        Assert.DoesNotContain(domain.GetTypes(), type => type.Name is "Incident" or "IncidentStatus" or "IncidentSeverity");
        Assert.Null(domain.GetType("Cohestra.Domain.Incidents.Incident"));
    }

    [Fact]
    public void Tenant_create_request_has_no_severity_write_surface()
    {
        var request = typeof(Cohestra.Application.Support.SupportIssueCreateRequest);
        Assert.Null(request.GetProperty("Severity"));
        Assert.DoesNotContain(
            request.GetConstructors().SelectMany(ctor => ctor.GetParameters()),
            parameter => parameter.Name is "Severity" or "severity");
    }
}
