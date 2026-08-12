using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCommunityBrandKit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE public.communities
                ADD COLUMN IF NOT EXISTS "LogoAssetId" character varying(36) NULL;
                """);

            migrationBuilder.Sql(
                """
                ALTER TABLE public.communities
                ADD COLUMN IF NOT EXISTS "AccentColor" character varying(7) NULL;
                """);

            migrationBuilder.Sql(
                """
                ALTER TABLE public.communities
                ADD COLUMN IF NOT EXISTS "DefaultHeroImageUrl" character varying(2048) NULL;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultHeroImageUrl",
                schema: "public",
                table: "communities");

            migrationBuilder.DropColumn(
                name: "AccentColor",
                schema: "public",
                table: "communities");

            migrationBuilder.DropColumn(
                name: "LogoAssetId",
                schema: "public",
                table: "communities");
        }
    }
}
