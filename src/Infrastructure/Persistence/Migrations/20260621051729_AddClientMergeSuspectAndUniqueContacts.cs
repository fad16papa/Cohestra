using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClientMergeSuspectAndUniqueContacts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_clients_NormalizedEmail",
                schema: "public",
                table: "clients");

            migrationBuilder.DropIndex(
                name: "IX_clients_NormalizedPhone",
                schema: "public",
                table: "clients");

            migrationBuilder.AddColumn<bool>(
                name: "IsMergeSuspect",
                schema: "public",
                table: "clients",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_clients_NormalizedEmail",
                schema: "public",
                table: "clients",
                column: "NormalizedEmail",
                unique: true,
                filter: "\"NormalizedEmail\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_clients_NormalizedPhone",
                schema: "public",
                table: "clients",
                column: "NormalizedPhone",
                unique: true,
                filter: "\"NormalizedPhone\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_clients_NormalizedEmail",
                schema: "public",
                table: "clients");

            migrationBuilder.DropIndex(
                name: "IX_clients_NormalizedPhone",
                schema: "public",
                table: "clients");

            migrationBuilder.DropColumn(
                name: "IsMergeSuspect",
                schema: "public",
                table: "clients");

            migrationBuilder.CreateIndex(
                name: "IX_clients_NormalizedEmail",
                schema: "public",
                table: "clients",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_clients_NormalizedPhone",
                schema: "public",
                table: "clients",
                column: "NormalizedPhone");
        }
    }
}
