using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class FormTemplateCaseInsensitiveUniqueName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tenant_form_templates_TenantId_Name",
                schema: "public",
                table: "tenant_form_templates");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_form_templates_TenantId_Name",
                schema: "public",
                table: "tenant_form_templates",
                columns: new[] { "TenantId", "Name" });

            migrationBuilder.Sql(
                """
                CREATE UNIQUE INDEX "IX_tenant_form_templates_TenantId_Name_lower"
                ON public.tenant_form_templates ("TenantId", lower("Name"));
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DROP INDEX IF EXISTS public."IX_tenant_form_templates_TenantId_Name_lower";
                """);

            migrationBuilder.DropIndex(
                name: "IX_tenant_form_templates_TenantId_Name",
                schema: "public",
                table: "tenant_form_templates");

            migrationBuilder.CreateIndex(
                name: "IX_tenant_form_templates_TenantId_Name",
                schema: "public",
                table: "tenant_form_templates",
                columns: new[] { "TenantId", "Name" },
                unique: true);
        }
    }
}
