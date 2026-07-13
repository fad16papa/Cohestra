namespace LeadGenerationCrm.Infrastructure.Activities;

public sealed class PublicWebOptions
{
    public const string SectionName = "PublicWeb";

    public string BaseUrl { get; set; } = "http://localhost:3000";
}
