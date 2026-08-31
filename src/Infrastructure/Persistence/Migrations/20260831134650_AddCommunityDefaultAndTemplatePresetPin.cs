using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCommunityDefaultAndTemplatePresetPin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PinnedRegistrationThemePreset",
                schema: "public",
                table: "tenant_form_templates",
                type: "character varying(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DefaultFormTemplateId",
                schema: "public",
                table: "communities",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_communities_DefaultFormTemplateId",
                schema: "public",
                table: "communities",
                column: "DefaultFormTemplateId");

            migrationBuilder.AddForeignKey(
                name: "FK_communities_tenant_form_templates_DefaultFormTemplateId",
                schema: "public",
                table: "communities",
                column: "DefaultFormTemplateId",
                principalSchema: "public",
                principalTable: "tenant_form_templates",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_communities_tenant_form_templates_DefaultFormTemplateId",
                schema: "public",
                table: "communities");

            migrationBuilder.DropIndex(
                name: "IX_communities_DefaultFormTemplateId",
                schema: "public",
                table: "communities");

            migrationBuilder.DropColumn(
                name: "PinnedRegistrationThemePreset",
                schema: "public",
                table: "tenant_form_templates");

            migrationBuilder.DropColumn(
                name: "DefaultFormTemplateId",
                schema: "public",
                table: "communities");
        }
    }
}
