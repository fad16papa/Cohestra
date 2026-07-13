using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddClientsAndRegistrations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "clients",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FullName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    NormalizedPhone = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    NormalizedEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    Profession = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    Nationality = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Residency = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ConsentGiven = table.Column<bool>(type: "boolean", nullable: false),
                    ReferralSource = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    LeadStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Notes = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_clients", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "registrations",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ActivityId = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    answers = table.Column<string>(type: "jsonb", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_registrations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_registrations_activities_ActivityId",
                        column: x => x.ActivityId,
                        principalSchema: "public",
                        principalTable: "activities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_registrations_clients_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "public",
                        principalTable: "clients",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_clients_LeadStatus",
                schema: "public",
                table: "clients",
                column: "LeadStatus");

            migrationBuilder.CreateIndex(
                name: "IX_clients_NormalizedEmail",
                schema: "public",
                table: "clients",
                column: "NormalizedEmail");

            migrationBuilder.CreateIndex(
                name: "IX_clients_NormalizedPhone",
                schema: "public",
                table: "clients",
                column: "NormalizedPhone");

            migrationBuilder.CreateIndex(
                name: "IX_registrations_ActivityId",
                schema: "public",
                table: "registrations",
                column: "ActivityId");

            migrationBuilder.CreateIndex(
                name: "IX_registrations_ClientId",
                schema: "public",
                table: "registrations",
                column: "ClientId");

            migrationBuilder.CreateIndex(
                name: "IX_registrations_CreatedAt",
                schema: "public",
                table: "registrations",
                column: "CreatedAt");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "registrations",
                schema: "public");

            migrationBuilder.DropTable(
                name: "clients",
                schema: "public");
        }
    }
}
