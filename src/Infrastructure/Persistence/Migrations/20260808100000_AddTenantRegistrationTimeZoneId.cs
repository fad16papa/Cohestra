using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantRegistrationTimeZoneId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Idempotent: local/dev DBs may already have this column from a manual
            // ALTER TABLE used to unblock startup before the Designer-file fix shipped.
            // Production paths that never hand-altered schema are unaffected.
            migrationBuilder.Sql(
                """
                ALTER TABLE public.tenants
                ADD COLUMN IF NOT EXISTS "RegistrationTimeZoneId" character varying(64) NOT NULL DEFAULT 'UTC';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE public.tenants
                DROP COLUMN IF EXISTS "RegistrationTimeZoneId";
                """);
        }
    }
}
