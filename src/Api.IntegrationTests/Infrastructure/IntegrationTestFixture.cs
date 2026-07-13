namespace LeadGenerationCrm.Api.IntegrationTests.Infrastructure;

public sealed class IntegrationTestFixture : IAsyncLifetime
{
    public IntegrationTestWebApplicationFactory Factory { get; } = new();

    public Task InitializeAsync() => Factory.InitializeAsync();

    public async Task DisposeAsync()
    {
        await Factory.DisposeAsync();
    }
}
