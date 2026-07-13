using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BackfillLegacyEmailConsent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Legacy tennis/pickleball forms collected email without a consent checkbox.
            // Treat existing clients with email as opted in so campaigns can reach them.
            migrationBuilder.Sql("""
                UPDATE public.clients
                SET "ConsentGiven" = true
                WHERE "ConsentGiven" = false
                  AND "Email" IS NOT NULL
                  AND BTRIM("Email") <> '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Consent backfill is not reversible without a snapshot of prior values.
        }
    }
}
