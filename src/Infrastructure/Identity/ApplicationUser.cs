using Microsoft.AspNetCore.Identity;

namespace LeadGenerationCrm.Infrastructure.Identity;

public class ApplicationUser : IdentityUser<Guid>
{
    public string? Nickname { get; set; }

    public string ThemePreference { get; set; } = "system";

    /// <summary>Operator accent tier hex (e.g. #2d6a4f). Null uses default brand tokens.</summary>
    public string? BrandAccentColor { get; set; }
}
