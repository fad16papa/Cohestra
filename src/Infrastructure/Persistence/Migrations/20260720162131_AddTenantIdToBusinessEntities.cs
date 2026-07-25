using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantIdToBusinessEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Seed Platform 0 default tenant before TenantId FKs (Story 11.2 / AD-9).
            migrationBuilder.Sql("""
                INSERT INTO public.tenants ("Id", "Slug", "Name", "Plan", "Status", "BillingStatus", "CreatedAt", "UpdatedAt")
                VALUES ('11111111-1111-1111-1111-111111111111', 'default', 'Default', 'Basic', 'Active', 'Free', TIMESTAMPTZ '2026-07-20 00:00:00+00', TIMESTAMPTZ '2026-07-20 00:00:00+00')
                ON CONFLICT ("Slug") DO NOTHING;

                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1
                        FROM public.tenants
                        WHERE "Id" = '11111111-1111-1111-1111-111111111111'
                          AND "Slug" = 'default'
                    ) THEN
                        RAISE EXCEPTION
                            'Story 11.2: tenants.Slug=default must use well-known Id 11111111-1111-1111-1111-111111111111';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropIndex(
                name: "IX_registrations_registration_number",
                schema: "public",
                table: "registrations");

            migrationBuilder.DropIndex(
                name: "IX_communities_Name",
                schema: "public",
                table: "communities");

            migrationBuilder.DropIndex(
                name: "IX_clients_NormalizedEmail",
                schema: "public",
                table: "clients");

            migrationBuilder.DropIndex(
                name: "IX_clients_NormalizedPhone",
                schema: "public",
                table: "clients");

            migrationBuilder.DropIndex(
                name: "IX_categories_Name",
                schema: "public",
                table: "categories");

            migrationBuilder.DropIndex(
                name: "IX_activities_Slug",
                schema: "public",
                table: "activities");

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "site_pages",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "site_homepage_templates",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "registrations",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "email_templates",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "communities",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "clients",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "client_timeline_events",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "categories",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "campaigns",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "campaign_recipients",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "campaign_assets",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                schema: "public",
                table: "activities",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            // AD-9 end state: existing rows backfilled via DEFAULT; drop silent DEFAULT so new
            // rows must set TenantId explicitly (app ApplyDefaultTenantIds until Epic 12–13).
            migrationBuilder.Sql("""
                ALTER TABLE public.site_pages ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.site_homepage_templates ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.registrations ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.email_templates ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.communities ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.clients ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.client_timeline_events ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.categories ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.campaigns ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.campaign_recipients ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.campaign_assets ALTER COLUMN "TenantId" DROP DEFAULT;
                ALTER TABLE public.activities ALTER COLUMN "TenantId" DROP DEFAULT;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_site_pages_TenantId",
                schema: "public",
                table: "site_pages",
                column: "TenantId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_site_homepage_templates_TenantId",
                schema: "public",
                table: "site_homepage_templates",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_registrations_TenantId",
                schema: "public",
                table: "registrations",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_registrations_TenantId_registration_number",
                schema: "public",
                table: "registrations",
                columns: new[] { "TenantId", "registration_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_email_templates_TenantId",
                schema: "public",
                table: "email_templates",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_communities_TenantId",
                schema: "public",
                table: "communities",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_communities_TenantId_Name",
                schema: "public",
                table: "communities",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_clients_TenantId",
                schema: "public",
                table: "clients",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_clients_TenantId_NormalizedEmail",
                schema: "public",
                table: "clients",
                columns: new[] { "TenantId", "NormalizedEmail" },
                unique: true,
                filter: "\"NormalizedEmail\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_clients_TenantId_NormalizedPhone",
                schema: "public",
                table: "clients",
                columns: new[] { "TenantId", "NormalizedPhone" },
                unique: true,
                filter: "\"NormalizedPhone\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_client_timeline_events_TenantId",
                schema: "public",
                table: "client_timeline_events",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_categories_TenantId",
                schema: "public",
                table: "categories",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_categories_TenantId_Name",
                schema: "public",
                table: "categories",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_campaigns_TenantId",
                schema: "public",
                table: "campaigns",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_recipients_TenantId",
                schema: "public",
                table: "campaign_recipients",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_campaign_assets_TenantId",
                schema: "public",
                table: "campaign_assets",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_activities_TenantId",
                schema: "public",
                table: "activities",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_activities_TenantId_Slug",
                schema: "public",
                table: "activities",
                columns: new[] { "TenantId", "Slug" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_activities_tenants_TenantId",
                schema: "public",
                table: "activities",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_campaign_assets_tenants_TenantId",
                schema: "public",
                table: "campaign_assets",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_campaign_recipients_tenants_TenantId",
                schema: "public",
                table: "campaign_recipients",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_campaigns_tenants_TenantId",
                schema: "public",
                table: "campaigns",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_categories_tenants_TenantId",
                schema: "public",
                table: "categories",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_client_timeline_events_tenants_TenantId",
                schema: "public",
                table: "client_timeline_events",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_clients_tenants_TenantId",
                schema: "public",
                table: "clients",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_communities_tenants_TenantId",
                schema: "public",
                table: "communities",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_email_templates_tenants_TenantId",
                schema: "public",
                table: "email_templates",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_registrations_tenants_TenantId",
                schema: "public",
                table: "registrations",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_site_homepage_templates_tenants_TenantId",
                schema: "public",
                table: "site_homepage_templates",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_site_pages_tenants_TenantId",
                schema: "public",
                table: "site_pages",
                column: "TenantId",
                principalSchema: "public",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_activities_tenants_TenantId",
                schema: "public",
                table: "activities");

            migrationBuilder.DropForeignKey(
                name: "FK_campaign_assets_tenants_TenantId",
                schema: "public",
                table: "campaign_assets");

            migrationBuilder.DropForeignKey(
                name: "FK_campaign_recipients_tenants_TenantId",
                schema: "public",
                table: "campaign_recipients");

            migrationBuilder.DropForeignKey(
                name: "FK_campaigns_tenants_TenantId",
                schema: "public",
                table: "campaigns");

            migrationBuilder.DropForeignKey(
                name: "FK_categories_tenants_TenantId",
                schema: "public",
                table: "categories");

            migrationBuilder.DropForeignKey(
                name: "FK_client_timeline_events_tenants_TenantId",
                schema: "public",
                table: "client_timeline_events");

            migrationBuilder.DropForeignKey(
                name: "FK_clients_tenants_TenantId",
                schema: "public",
                table: "clients");

            migrationBuilder.DropForeignKey(
                name: "FK_communities_tenants_TenantId",
                schema: "public",
                table: "communities");

            migrationBuilder.DropForeignKey(
                name: "FK_email_templates_tenants_TenantId",
                schema: "public",
                table: "email_templates");

            migrationBuilder.DropForeignKey(
                name: "FK_registrations_tenants_TenantId",
                schema: "public",
                table: "registrations");

            migrationBuilder.DropForeignKey(
                name: "FK_site_homepage_templates_tenants_TenantId",
                schema: "public",
                table: "site_homepage_templates");

            migrationBuilder.DropForeignKey(
                name: "FK_site_pages_tenants_TenantId",
                schema: "public",
                table: "site_pages");

            migrationBuilder.DropIndex(
                name: "IX_site_pages_TenantId",
                schema: "public",
                table: "site_pages");

            migrationBuilder.DropIndex(
                name: "IX_site_homepage_templates_TenantId",
                schema: "public",
                table: "site_homepage_templates");

            migrationBuilder.DropIndex(
                name: "IX_registrations_TenantId",
                schema: "public",
                table: "registrations");

            migrationBuilder.DropIndex(
                name: "IX_registrations_TenantId_registration_number",
                schema: "public",
                table: "registrations");

            migrationBuilder.DropIndex(
                name: "IX_email_templates_TenantId",
                schema: "public",
                table: "email_templates");

            migrationBuilder.DropIndex(
                name: "IX_communities_TenantId",
                schema: "public",
                table: "communities");

            migrationBuilder.DropIndex(
                name: "IX_communities_TenantId_Name",
                schema: "public",
                table: "communities");

            migrationBuilder.DropIndex(
                name: "IX_clients_TenantId",
                schema: "public",
                table: "clients");

            migrationBuilder.DropIndex(
                name: "IX_clients_TenantId_NormalizedEmail",
                schema: "public",
                table: "clients");

            migrationBuilder.DropIndex(
                name: "IX_clients_TenantId_NormalizedPhone",
                schema: "public",
                table: "clients");

            migrationBuilder.DropIndex(
                name: "IX_client_timeline_events_TenantId",
                schema: "public",
                table: "client_timeline_events");

            migrationBuilder.DropIndex(
                name: "IX_categories_TenantId",
                schema: "public",
                table: "categories");

            migrationBuilder.DropIndex(
                name: "IX_categories_TenantId_Name",
                schema: "public",
                table: "categories");

            migrationBuilder.DropIndex(
                name: "IX_campaigns_TenantId",
                schema: "public",
                table: "campaigns");

            migrationBuilder.DropIndex(
                name: "IX_campaign_recipients_TenantId",
                schema: "public",
                table: "campaign_recipients");

            migrationBuilder.DropIndex(
                name: "IX_campaign_assets_TenantId",
                schema: "public",
                table: "campaign_assets");

            migrationBuilder.DropIndex(
                name: "IX_activities_TenantId",
                schema: "public",
                table: "activities");

            migrationBuilder.DropIndex(
                name: "IX_activities_TenantId_Slug",
                schema: "public",
                table: "activities");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "site_pages");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "site_homepage_templates");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "registrations");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "email_templates");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "communities");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "clients");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "client_timeline_events");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "categories");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "campaigns");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "campaign_recipients");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "campaign_assets");

            migrationBuilder.DropColumn(
                name: "TenantId",
                schema: "public",
                table: "activities");

            migrationBuilder.CreateIndex(
                name: "IX_registrations_registration_number",
                schema: "public",
                table: "registrations",
                column: "registration_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_communities_Name",
                schema: "public",
                table: "communities",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_clients_NormalizedEmail",
                schema: "public",
                table: "clients",
                column: "NormalizedEmail",
                unique: true,
                filter: "\"NormalizedEmail\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_clients_NormalizedPhone",
                schema: "public",
                table: "clients",
                column: "NormalizedPhone",
                unique: true,
                filter: "\"NormalizedPhone\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_categories_Name",
                schema: "public",
                table: "categories",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_activities_Slug",
                schema: "public",
                table: "activities",
                column: "Slug",
                unique: true);
        }
    }
}
