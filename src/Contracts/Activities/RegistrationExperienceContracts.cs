namespace Cohestra.Contracts.Activities;

public sealed record RegistrationExperienceDto(
    string? Layout = null,
    string? Style = null,
    string? Flow = null,
    string? HeroDisplay = null);

public sealed record ResolvedRegistrationExperienceDto(
    string Layout,
    string Style,
    string Flow,
    string HeroDisplay);
