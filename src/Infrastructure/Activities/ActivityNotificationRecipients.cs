using Cohestra.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Cohestra.Infrastructure.Activities;

internal static class ActivityNotificationRecipients
{
    internal static async Task<IReadOnlyList<string>> ResolveAsync(
        CohestraDbContext dbContext,
        Guid tenantId,
        string? adminContactEmail,
        bool includeTeamMembers,
        bool includeAdminContact,
        CancellationToken cancellationToken = default)
    {
        var emails = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (includeTeamMembers)
        {
            var memberEmails = await dbContext.TenantMemberships
                .AsNoTracking()
                .Where(membership => membership.TenantId == tenantId)
                .Join(
                    dbContext.Users.AsNoTracking(),
                    membership => membership.UserId,
                    user => user.Id,
                    (_, user) => user)
                .Where(user => user.EmailConfirmed && user.Email != null)
                .Select(user => user.Email!)
                .ToListAsync(cancellationToken);

            foreach (var email in memberEmails)
            {
                if (!string.IsNullOrWhiteSpace(email))
                {
                    emails.Add(email.Trim());
                }
            }
        }

        if (includeAdminContact && !string.IsNullOrWhiteSpace(adminContactEmail))
        {
            emails.Add(adminContactEmail.Trim());
        }

        return emails.OrderBy(email => email, StringComparer.OrdinalIgnoreCase).ToList();
    }
}
