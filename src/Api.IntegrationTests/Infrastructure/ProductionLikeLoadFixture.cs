namespace Cohestra.Api.IntegrationTests.Infrastructure;

public sealed class ProductionLikeLoadFixture : IAsyncLifetime
{
    public ProductionLikeLoadWebApplicationFactory Factory { get; } = new();

    public Task InitializeAsync() => Factory.InitializeAsync();

    public async Task DisposeAsync() => await Factory.DisposeAsync();
}

[CollectionDefinition(ProductionLikeLoadCollection.Name)]
public sealed class ProductionLikeLoadCollection : ICollectionFixture<ProductionLikeLoadFixture>
{
    public const string Name = nameof(ProductionLikeLoadCollection);
}