using LeadGenerationCrm.Domain.Activities;
using LeadGenerationCrm.Domain.Registrations;

namespace LeadGenerationCrm.Infrastructure.Registrations;

internal static class RegistrationRegistrantDisplayName
{
    public static string Resolve(Registration registration)
    {
        var schema = registration.Activity?.FormSchema;
        if (schema is not null)
        {
            var profile = ClientProfileExtractor.Extract(schema, registration.Answers);
            if (!string.IsNullOrWhiteSpace(profile.DisplayName))
            {
                return profile.DisplayName;
            }
        }

        return registration.Client?.FullName?.Trim() ?? string.Empty;
    }
}
