using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCommunitiesAndCategories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "categories",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_categories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "communities",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_communities", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_categories_Name",
                schema: "public",
                table: "categories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_communities_Name",
                schema: "public",
                table: "communities",
                column: "Name",
                unique: true);

            migrationBuilder.Sql("""
                INSERT INTO public.communities ("Id", "Name", "CreatedAt", "UpdatedAt")
                SELECT gen_random_uuid(), labels."Name", NOW(), NOW()
                FROM (
                    SELECT DISTINCT BTRIM("CommunityLabel") AS "Name"
                    FROM public.activities
                    WHERE BTRIM("CommunityLabel") <> ''
                ) AS labels
                ON CONFLICT ("Name") DO NOTHING;
                """);

            migrationBuilder.Sql("""
                INSERT INTO public.categories ("Id", "Name", "CreatedAt", "UpdatedAt")
                SELECT gen_random_uuid(), labels."Name", NOW(), NOW()
                FROM (
                    SELECT DISTINCT BTRIM("Category") AS "Name"
                    FROM public.activities
                    WHERE BTRIM("Category") <> ''
                ) AS labels
                ON CONFLICT ("Name") DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "categories",
                schema: "public");

            migrationBuilder.DropTable(
                name: "communities",
                schema: "public");
        }
    }
}
