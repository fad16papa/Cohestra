using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BackfillActivityCatalogPerTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Story P2 / Epic 19: activities edited after catalog validation shipped must have
            // matching Communities + Categories rows per tenant (not just global names from 20260621160613).
            migrationBuilder.Sql("""
                INSERT INTO public.communities ("Id", "TenantId", "Name", "CreatedAt", "UpdatedAt")
                SELECT gen_random_uuid(), labels."TenantId", labels."Name", NOW(), NOW()
                FROM (
                    SELECT DISTINCT a."TenantId", BTRIM(a."CommunityLabel") AS "Name"
                    FROM public.activities a
                    WHERE BTRIM(a."CommunityLabel") <> ''
                ) AS labels
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM public.communities c
                    WHERE c."TenantId" = labels."TenantId"
                      AND c."Name" = labels."Name"
                );
                """);

            migrationBuilder.Sql("""
                INSERT INTO public.categories ("Id", "TenantId", "Name", "CreatedAt", "UpdatedAt")
                SELECT gen_random_uuid(), labels."TenantId", labels."Name", NOW(), NOW()
                FROM (
                    SELECT DISTINCT a."TenantId", BTRIM(a."Category") AS "Name"
                    FROM public.activities a
                    WHERE BTRIM(a."Category") <> ''
                ) AS labels
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM public.categories c
                    WHERE c."TenantId" = labels."TenantId"
                      AND c."Name" = labels."Name"
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Catalog backfill is not reversible without a snapshot of prior rows.
        }
    }
}
