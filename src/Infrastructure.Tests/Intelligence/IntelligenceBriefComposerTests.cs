using Cohestra.Application.Intelligence;
using Cohestra.Application.Tenants;
using Cohestra.Contracts.Intelligence;
using Cohestra.Domain.Billing;
using Cohestra.Domain.Clients;
using Cohestra.Domain.Tenants;
using Cohestra.Infrastructure.Intelligence;
using Cohestra.Infrastructure.Persistence;
using Cohestra.Infrastructure.Tenancy;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace Cohestra.Infrastructure.Tests.Intelligence;

public sealed class IntelligenceBriefComposerTests
{
    [Fact]
    public async Task GetBrief_WhenSynthesisDisabled_ReturnsDeterministicFacts()
    {
        var (composer, _) = await CreateComposerAsync(
            new IntelligenceOptions { SynthesisEnabled = false },
            new ThrowingSynthesizer());

        var brief = await composer.GetBriefAsync();

        Assert.Equal(IntelligenceBriefService.DeterministicMode, brief.Mode);
        Assert.Contains(brief.Insights, insight => insight.Kind == "follow_up_due");
    }

    [Fact]
    public async Task GetBrief_WhenSynthesizerThrows_FallsBackToDeterministic()
    {
        var (composer, _) = await CreateComposerAsync(
            new IntelligenceOptions { SynthesisEnabled = true, ApiKey = "sk-test" },
            new ThrowingSynthesizer());

        var brief = await composer.GetBriefAsync();

        Assert.Equal(IntelligenceBriefService.DeterministicMode, brief.Mode);
        Assert.Contains(brief.Insights, insight => insight.Kind == "follow_up_due");
    }

    [Fact]
    public async Task GetBrief_WhenGuardRejectsInventedNumber_FallsBackToDeterministic()
    {
        var (composer, dueId) = await CreateComposerAsync(
            new IntelligenceOptions { SynthesisEnabled = true, ApiKey = "sk-test" },
            new InventedNumberSynthesizer());

        var brief = await composer.GetBriefAsync();

        Assert.Equal(IntelligenceBriefService.DeterministicMode, brief.Mode);
        Assert.Contains(brief.Insights, insight => insight.Id == dueId && insight.Title.Contains("due", StringComparison.OrdinalIgnoreCase));
    }

    private static async Task<(IntelligenceBriefComposer Composer, string DueInsightId)> CreateComposerAsync(
        IntelligenceOptions options,
        IIntelligenceSynthesizer synthesizer)
    {
        var tenantId = Guid.CreateVersion7();
        var current = new CurrentTenant();
        current.SetResolved(tenantId, "synth");
        var db = CreateDb(current);
        await SeedDueClientAsync(db, tenantId);
        var facts = new IntelligenceBriefService(db, current);
        var composer = new IntelligenceBriefComposer(
            facts,
            synthesizer,
            Options.Create(options),
            NullLogger<IntelligenceBriefComposer>.Instance);
        var brief = await facts.GetBriefAsync();
        var due = Assert.Single(brief.Insights, insight => insight.Kind == "follow_up_due");
        return (composer, due.Id);
    }

    private static CohestraDbContext CreateDb(ICurrentTenant currentTenant)
    {
        var builder = new DbContextOptionsBuilder<CohestraDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString());
        return new CohestraDbContext(builder.Options, currentTenant);
    }

    private static async Task SeedDueClientAsync(CohestraDbContext db, Guid tenantId)
    {
        var now = DateTimeOffset.UtcNow;
        db.Tenants.Add(new Tenant
        {
            Id = tenantId,
            Slug = "synth",
            Name = "T",
            Plan = TenantPlan.Core,
            Status = TenantStatus.Active,
            BillingStatus = BillingStatus.Free,
            CreatedAt = now,
            UpdatedAt = now,
        });
        db.Clients.Add(new Client
        {
            Id = Guid.NewGuid(),
            TenantId = tenantId,
            FullName = "Due Person",
            LeadStatus = LeadStatus.Active,
            NextFollowUpAt = now.AddHours(-1),
            CreatedAt = now,
            UpdatedAt = now,
        });
        await db.SaveChangesAsync();
    }

    private sealed class ThrowingSynthesizer : IIntelligenceSynthesizer
    {
        public Task<IReadOnlyList<IntelligenceWordingDraft>?> SynthesizeAsync(
            IntelligenceBriefResponse facts,
            CancellationToken cancellationToken = default) =>
            throw new InvalidOperationException("provider down");
    }

    private sealed class InventedNumberSynthesizer : IIntelligenceSynthesizer
    {
        public Task<IReadOnlyList<IntelligenceWordingDraft>?> SynthesizeAsync(
            IntelligenceBriefResponse facts,
            CancellationToken cancellationToken = default)
        {
            var drafts = facts.Insights
                .Select(insight => new IntelligenceWordingDraft(
                    insight.Id,
                    "999 people need you immediately",
                    insight.WhyItMatters,
                    insight.WhatChanged))
                .ToList();
            return Task.FromResult<IReadOnlyList<IntelligenceWordingDraft>?>(drafts);
        }
    }
}
