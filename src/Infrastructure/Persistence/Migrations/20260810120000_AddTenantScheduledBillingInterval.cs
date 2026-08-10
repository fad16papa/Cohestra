using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantScheduledBillingInterval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE public.tenants
                ADD COLUMN IF NOT EXISTS "ScheduledBillingInterval" character varying(20) NULL;
                """);

            migrationBuilder.Sql(
                """
                ALTER TABLE public.tenants
                ADD COLUMN IF NOT EXISTS "StripeSubscriptionScheduleId" character varying(255) NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "StripeSubscriptionScheduleId",
                schema: "public",
                table: "tenants");

            migrationBuilder.DropColumn(
                name: "ScheduledBillingInterval",
                schema: "public",
                table: "tenants");
        }
    }
}
