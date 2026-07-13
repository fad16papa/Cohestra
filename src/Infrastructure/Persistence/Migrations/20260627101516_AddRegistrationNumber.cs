using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRegistrationNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "registration_number",
                schema: "public",
                table: "registrations",
                type: "character varying(17)",
                maxLength: 17,
                nullable: true);

            migrationBuilder.Sql(
                """
                DELETE FROM public.registrations older
                USING public.registrations newer
                WHERE older."ClientId" = newer."ClientId"
                  AND older."ActivityId" = newer."ActivityId"
                  AND older."CreatedAt" > newer."CreatedAt";
                """);

            migrationBuilder.Sql(
                """
                WITH numbered AS (
                    SELECT
                        "Id",
                        ROW_NUMBER() OVER (
                            PARTITION BY TO_CHAR("CreatedAt" AT TIME ZONE 'UTC', 'YYYYMMDD')
                            ORDER BY "CreatedAt", "Id"
                        ) AS seq,
                        TO_CHAR("CreatedAt" AT TIME ZONE 'UTC', 'YYYYMMDD') AS day
                    FROM public.registrations
                )
                UPDATE public.registrations registration
                SET registration_number = 'REG' || numbered.day || LPAD(numbered.seq::text, 6, '0')
                FROM numbered
                WHERE registration."Id" = numbered."Id";
                """);

            migrationBuilder.AlterColumn<string>(
                name: "registration_number",
                schema: "public",
                table: "registrations",
                type: "character varying(17)",
                maxLength: 17,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(17)",
                oldMaxLength: 17,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_registrations_ClientId_ActivityId",
                schema: "public",
                table: "registrations",
                columns: new[] { "ClientId", "ActivityId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_registrations_registration_number",
                schema: "public",
                table: "registrations",
                column: "registration_number",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_registrations_ClientId_ActivityId",
                schema: "public",
                table: "registrations");

            migrationBuilder.DropIndex(
                name: "IX_registrations_registration_number",
                schema: "public",
                table: "registrations");

            migrationBuilder.DropColumn(
                name: "registration_number",
                schema: "public",
                table: "registrations");
        }
    }
}
