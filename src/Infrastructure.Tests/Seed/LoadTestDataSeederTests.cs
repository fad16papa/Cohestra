using Cohestra.Domain.Activities;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Seed;

namespace Cohestra.Infrastructure.Tests.Seed;

public sealed class LoadTestDataSeederTests
{
    [Theory]
    [InlineData(12, 10, 15)]
    [InlineData(50, 20, 30)]
    [InlineData(3, 10, 10)]
    public void BuildActivityStatusList_ReturnsExpectedCounts(
        int published,
        int drafts,
        int archived)
    {
        var statuses = LoadTestDataSeeder.BuildActivityStatusList(published, drafts, archived);

        Assert.Equal(published + drafts + archived, statuses.Count);
        Assert.Equal(published, statuses.Count(s => s == ActivityStatus.Published));
        Assert.Equal(drafts, statuses.Count(s => s == ActivityStatus.Draft));
        Assert.Equal(archived, statuses.Count(s => s == ActivityStatus.Archived));
    }

    [Fact]
    public void TenantSpecs_DefineFiveLoadTestWorkspacesWithExpectedVolumes()
    {
        Assert.Equal(5, LoadTestDataSeeder.TenantSpecs.Length);

        var coreTenants = LoadTestDataSeeder.TenantSpecs
            .Where(spec => spec.Plan == TenantPlan.Core)
            .ToList();
        Assert.Equal(2, coreTenants.Count);
        Assert.All(coreTenants, spec =>
        {
            Assert.Equal(3, spec.Communities);
            Assert.Equal(12, spec.PublishedActivities);
            Assert.Equal(10, spec.DraftActivities);
            Assert.Equal(15, spec.ArchivedActivities);
            Assert.Equal(1_000, spec.RegistrationsThisMonth);
        });

        var proTenants = LoadTestDataSeeder.TenantSpecs
            .Where(spec => spec.Plan == TenantPlan.Pro)
            .ToList();
        Assert.Equal(2, proTenants.Count);
        Assert.All(proTenants, spec =>
        {
            Assert.Equal(10, spec.Communities);
            Assert.Equal(50, spec.PublishedActivities);
            Assert.Equal(20, spec.DraftActivities);
            Assert.Equal(30, spec.ArchivedActivities);
            Assert.Equal(5_000, spec.RegistrationsThisMonth);
        });

        var basicTenant = Assert.Single(
            LoadTestDataSeeder.TenantSpecs,
            spec => spec.Plan == TenantPlan.Basic);
        Assert.Equal(1, basicTenant.Communities);
        Assert.Equal(4, basicTenant.PublishedActivities);
        Assert.Equal(10, basicTenant.DraftActivities);
        Assert.Equal(10, basicTenant.ArchivedActivities);
        Assert.Equal(250, basicTenant.RegistrationsThisMonth);
    }

    [Fact]
    public void TenantSpecs_UseValidTenantSlugFormat()
    {
        Assert.All(LoadTestDataSeeder.TenantSpecs, spec =>
        {
            var error = TenantSlugRules.ValidateForProvision(spec.Slug);
            Assert.Null(error);
            Assert.Equal(spec.Slug, TenantSlugRules.Normalize(spec.Slug));
        });
    }

    [Fact]
    public void TenantSpecs_UseUniqueSlugsAndAdminEmails()
    {
        var slugs = LoadTestDataSeeder.TenantSpecs.Select(spec => spec.Slug).ToList();
        var emails = LoadTestDataSeeder.TenantSpecs.Select(spec => spec.AdminEmail).ToList();

        Assert.Equal(slugs.Count, slugs.Distinct(StringComparer.Ordinal).Count());
        Assert.Equal(emails.Count, emails.Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Assert.All(slugs, slug => Assert.StartsWith(LoadTestDataSeeder.SlugPrefix, slug, StringComparison.Ordinal));
    }

    [Fact]
    public void ResolveRegistrationAssignment_ProducesUniquePairsWithinCapacity()
    {
        const int published = 12;
        const int clients = 84;
        const int registrations = 1_000;

        var pairs = new HashSet<(int ActivityIndex, int ClientIndex)>();
        for (var index = 0; index < registrations; index++)
        {
            var pair = LoadTestDataSeeder.ResolveRegistrationAssignment(index, published, clients);
            Assert.True(pairs.Add(pair), $"Duplicate pair at index {index}: {pair}");
        }

        Assert.Equal(registrations, pairs.Count);
    }

    [Fact]
    public void LoadCoreAlphaCalendarConflictSampleSlugs_AreStablePublishedFixtures()
    {
        Assert.Equal(3, LoadTestDataSeeder.LoadCoreAlphaCalendarConflictSampleSlugs.Length);
        Assert.All(LoadTestDataSeeder.LoadCoreAlphaCalendarConflictSampleSlugs, slug =>
            Assert.StartsWith("load-core-alpha-", slug, StringComparison.Ordinal));
    }

    [Fact]
    public void ResolveRegistrationAssignment_ThrowsWhenClientCapacityIsInsufficient()
    {
        var exception = Assert.Throws<InvalidOperationException>(() =>
            LoadTestDataSeeder.ResolveRegistrationAssignment(
                registrationIndex: 120,
                publishedActivityCount: 12,
                clientCount: 10));

        Assert.Contains("client slot 11", exception.Message, StringComparison.Ordinal);
    }
}
