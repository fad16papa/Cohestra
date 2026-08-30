using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UniqueTenantFormTemplateName : Migration
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
                columns: new[] { "TenantId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
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
        }
    }
}
