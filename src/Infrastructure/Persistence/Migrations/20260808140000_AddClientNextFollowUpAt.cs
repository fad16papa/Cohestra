using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClientNextFollowUpAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE public.clients
                ADD COLUMN IF NOT EXISTS "NextFollowUpAt" timestamp with time zone NULL;
                """);

            migrationBuilder.Sql(
                """
                CREATE INDEX IF NOT EXISTS "IX_clients_NextFollowUpAt"
                ON public.clients ("NextFollowUpAt");
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_clients_NextFollowUpAt",
                schema: "public",
                table: "clients");

            migrationBuilder.DropColumn(
                name: "NextFollowUpAt",
                schema: "public",
                table: "clients");
        }
    }
}
