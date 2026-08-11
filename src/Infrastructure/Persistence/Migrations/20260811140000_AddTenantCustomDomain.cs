using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantCustomDomain : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE public.tenants
                ADD COLUMN IF NOT EXISTS "CustomDomain" character varying(253) NULL;
                """);

            migrationBuilder.Sql(
                """
                ALTER TABLE public.tenants
                ADD COLUMN IF NOT EXISTS "CustomDomainVerifiedAt" timestamp with time zone NULL;
                """);

            migrationBuilder.Sql(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_tenants_CustomDomain"
                ON public.tenants ("CustomDomain")
                WHERE "CustomDomain" IS NOT NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP INDEX IF EXISTS public."IX_tenants_CustomDomain";
                """);

            migrationBuilder.DropColumn(
                name: "CustomDomainVerifiedAt",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "CustomDomain",
                schema: "public",
                table: "tenants");
        }
    }
}
