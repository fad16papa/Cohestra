using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportIssues : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "support_issues",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    issue_number = table.Column<string>(type: "character varying(17)", maxLength: 17, nullable: false),
                    SubmittedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Subject = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    OperatorEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: false),
                    OperatorDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    TenantSlug = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    TenantName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Plan = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    UserAgent = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: true),
                    InternalNote = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_support_issues", x => x.Id);
                    table.ForeignKey(
                        name: "FK_support_issues_tenants_TenantId",
                        column: x => x.TenantId,
                        principalSchema: "public",
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "support_issue_attachments",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupportIssueId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    RelativePath = table.Column<string>(type: "character varying(512)", maxLength: 512, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_support_issue_attachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_support_issue_attachments_support_issues_SupportIssueId",
                        column: x => x.SupportIssueId,
                        principalSchema: "public",
                        principalTable: "support_issues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_support_issue_attachments_SupportIssueId",
                schema: "public",
                table: "support_issue_attachments",
                column: "SupportIssueId");

            migrationBuilder.CreateIndex(
                name: "IX_support_issues_CreatedAt",
                schema: "public",
                table: "support_issues",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_support_issues_issue_number",
                schema: "public",
                table: "support_issues",
                column: "issue_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_support_issues_TenantId",
                schema: "public",
                table: "support_issues",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_support_issues_TenantId_SubmittedByUserId_CreatedAt",
                schema: "public",
                table: "support_issues",
                columns: new[] { "TenantId", "SubmittedByUserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "support_issue_attachments",
                schema: "public");

            migrationBuilder.DropTable(
                name: "support_issues",
                schema: "public");
        }
    }
}
