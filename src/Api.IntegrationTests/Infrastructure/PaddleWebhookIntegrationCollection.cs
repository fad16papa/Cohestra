namespace Cohestra.Api.IntegrationTests.Infrastructure;

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class PaddleWebhookIntegrationCollection : ICollectionFixture<PaddleWebhookIntegrationFixture>
{
    public const string Name = "PaddleWebhookIntegration";
}

public sealed class PaddleWebhookIntegrationFixture : IAsyncLifetime
{
    public PaddleWebhookWebApplicationFactory Factory { get; private set; } = null!;

    public async Task InitializeAsync()
    {
        Factory = new PaddleWebhookWebApplicationFactory();
        await Factory.InitializeAsync();
    }

    public Task DisposeAsync() => Factory.DisposeAsync().AsTask();
}
