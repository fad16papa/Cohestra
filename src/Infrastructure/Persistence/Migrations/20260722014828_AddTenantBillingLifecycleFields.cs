using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantBillingLifecycleFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastActivityAt",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastDormancyWarningAt",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastOnHoldNoticeAt",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastPastDueNoticeAt",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastTrialReminderSentAt",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ScheduledPlan",
                schema: "public",
                table: "tenants",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ScheduledPlanEffectiveAt",
                schema: "public",
                table: "tenants",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastActivityAt",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "LastDormancyWarningAt",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "LastOnHoldNoticeAt",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "LastPastDueNoticeAt",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "LastTrialReminderSentAt",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "ScheduledPlan",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "ScheduledPlanEffectiveAt",
                schema: "public",
                table: "tenants");
        }
    }
}
