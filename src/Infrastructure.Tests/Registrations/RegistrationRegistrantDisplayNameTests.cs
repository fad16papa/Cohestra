using LeadGenerationCrm.Domain.Activities;
using LeadGenerationCrm.Domain.Clients;
using LeadGenerationCrm.Domain.Registrations;
using LeadGenerationCrm.Infrastructure.Registrations;

namespace LeadGenerationCrm.Infrastructure.Tests.Registrations;

public sealed class RegistrationRegistrantDisplayNameTests
{
    [Fact]
    public void Resolve_UsesNameFromRegistrationAnswers_NotCurrentClientFullName()
    {
        var registration = new Registration
        {
            Id = Guid.NewGuid(),
            RegistrationNumber = "REG20260101000001",
            CreatedAt = DateTimeOffset.UtcNow,
            Answers = new Dictionary<string, object?>
            {
                ["full_name"] = "Original Registrant",
                ["phone"] = "+6591234567",
            },
            Client = new Client
            {
                Id = Guid.NewGuid(),
                FullName = "Updated Client Master Name",
            },
            Activity = new Activity
            {
                Id = Guid.NewGuid(),
                FormSchema = new ActivityFormSchema
                {
                    Version = 1,
                    Fields =
                    [
                        new FormFieldDefinition
                        {
                            Id = "full_name",
                            Type = FormFieldTypes.Text,
                            Label = "Full name",
                            Required = true,
                        },
                        new FormFieldDefinition
                        {
                            Id = "phone",
                            Type = FormFieldTypes.Phone,
                            Label = "Phone",
                            Required = true,
                            PhoneCountry = "SG",
                        },
                    ],
                },
            },
        };

        var displayName = RegistrationRegistrantDisplayName.Resolve(registration);

        Assert.Equal("Original Registrant", displayName);
    }

    [Fact]
    public void Resolve_FallsBackToClientFullNameWhenAnswersHaveNoName()
    {
        var registration = new Registration
        {
            Id = Guid.NewGuid(),
            RegistrationNumber = "REG20260101000002",
            Answers = new Dictionary<string, object?>(),
            Client = new Client
            {
                Id = Guid.NewGuid(),
                FullName = "Client Fallback",
            },
            Activity = new Activity
            {
                Id = Guid.NewGuid(),
                FormSchema = null,
            },
        };

        var displayName = RegistrationRegistrantDisplayName.Resolve(registration);

        Assert.Equal("Client Fallback", displayName);
    }
}
