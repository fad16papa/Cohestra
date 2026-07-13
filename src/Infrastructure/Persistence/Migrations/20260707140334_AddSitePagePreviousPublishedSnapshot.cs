using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSitePagePreviousPublishedSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "PreviousPublishedAt",
                schema: "public",
                table: "site_pages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "previous_published_sections_json",
                schema: "public",
                table: "site_pages",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PreviousPublishedAt",
                schema: "public",
                table: "site_pages");

            migrationBuilder.DropColumn(
                name: "previous_published_sections_json",
                schema: "public",
                table: "site_pages");
        }
    }
}
