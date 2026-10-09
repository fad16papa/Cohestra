using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPaddleWebhookDeliveries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "paddle_webhook_deliveries",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    EventType = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: true),
                    Disposition = table.Column<int>(type: "integer", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: true),
                    HttpStatus = table.Column<int>(type: "integer", nullable: false),
                    DetailSanitized = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    ObservedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_paddle_webhook_deliveries", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_paddle_webhook_deliveries_Disposition",
                schema: "public",
                table: "paddle_webhook_deliveries",
                column: "Disposition");

            migrationBuilder.CreateIndex(
                name: "IX_paddle_webhook_deliveries_EventType",
                schema: "public",
                table: "paddle_webhook_deliveries",
                column: "EventType");

            migrationBuilder.CreateIndex(
                name: "IX_paddle_webhook_deliveries_ObservedAt_Id",
                schema: "public",
                table: "paddle_webhook_deliveries",
                columns: new[] { "ObservedAt", "Id" });

            migrationBuilder.CreateIndex(
                name: "IX_paddle_webhook_deliveries_TenantId",
                schema: "public",
                table: "paddle_webhook_deliveries",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "paddle_webhook_deliveries",
                schema: "public");
        }
    }
}
