namespace Cohestra.Infrastructure.Email;

public sealed class PlatformBrandAssets
{
    public static byte[]? TryLoadLogoPng()
    {
        var assembly = typeof(PlatformBrandAssets).Assembly;
        var resourceName = assembly
            .GetManifestResourceNames()
            .FirstOrDefault(name =>
                name.EndsWith("cohestra-logo.png", StringComparison.OrdinalIgnoreCase));

        if (resourceName is null)
        {
            return null;
        }

        using var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream is null)
        {
            return null;
        }

        using var memory = new MemoryStream();
        stream.CopyTo(memory);
        return memory.ToArray();
    }
}
