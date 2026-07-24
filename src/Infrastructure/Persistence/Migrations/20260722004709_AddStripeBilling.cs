using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStripeBilling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "HasConsumedTrial",
                schema: "public",
                table: "tenants",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "stripe_webhook_events",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    EventId = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    EventType = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ProcessedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stripe_webhook_events", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tenants_StripeCustomerId",
                schema: "public",
                table: "tenants",
                column: "StripeCustomerId",
                unique: true,
                filter: "\"StripeCustomerId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_tenants_StripeSubscriptionId",
                schema: "public",
                table: "tenants",
                column: "StripeSubscriptionId",
                unique: true,
                filter: "\"StripeSubscriptionId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_stripe_webhook_events_EventId",
                schema: "public",
                table: "stripe_webhook_events",
                column: "EventId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "stripe_webhook_events",
                schema: "public");

            migrationBuilder.DropIndex(
                name: "IX_tenants_StripeCustomerId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropIndex(
                name: "IX_tenants_StripeSubscriptionId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "HasConsumedTrial",
                schema: "public",
                table: "tenants");
        }
    }
}
