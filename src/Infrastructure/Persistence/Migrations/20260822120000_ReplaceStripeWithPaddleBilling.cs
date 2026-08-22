using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceStripeWithPaddleBilling : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_tenants_StripeCustomerId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropIndex(
                name: "IX_tenants_StripeSubscriptionId",
                schema: "public",
                table: "tenants");

            migrationBuilder.RenameColumn(
                name: "StripeCustomerId",
                schema: "public",
                table: "tenants",
                newName: "PaddleCustomerId");

            migrationBuilder.RenameColumn(
                name: "StripeSubscriptionId",
                schema: "public",
                table: "tenants",
                newName: "PaddleSubscriptionId");

            migrationBuilder.RenameColumn(
                name: "StripeSubscriptionScheduleId",
                schema: "public",
                table: "tenants",
                newName: "PaddleSubscriptionScheduleId");

            migrationBuilder.CreateIndex(
                name: "IX_tenants_PaddleCustomerId",
                schema: "public",
                table: "tenants",
                column: "PaddleCustomerId",
                unique: true,
                filter: "\"PaddleCustomerId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_tenants_PaddleSubscriptionId",
                schema: "public",
                table: "tenants",
                column: "PaddleSubscriptionId",
                unique: true,
                filter: "\"PaddleSubscriptionId\" IS NOT NULL");

            migrationBuilder.RenameTable(
                name: "stripe_webhook_events",
                schema: "public",
                newName: "paddle_webhook_events",
                newSchema: "public");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "paddle_webhook_events",
                schema: "public",
                newName: "stripe_webhook_events",
                newSchema: "public");

            migrationBuilder.DropIndex(
                name: "IX_tenants_PaddleCustomerId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropIndex(
                name: "IX_tenants_PaddleSubscriptionId",
                schema: "public",
                table: "tenants");

            migrationBuilder.RenameColumn(
                name: "PaddleCustomerId",
                schema: "public",
                table: "tenants",
                newName: "StripeCustomerId");

            migrationBuilder.RenameColumn(
                name: "PaddleSubscriptionId",
                schema: "public",
                table: "tenants",
                newName: "StripeSubscriptionId");

            migrationBuilder.RenameColumn(
                name: "PaddleSubscriptionScheduleId",
                schema: "public",
                table: "tenants",
                newName: "StripeSubscriptionScheduleId");

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
        }
    }
}
