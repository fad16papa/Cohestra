using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlatformOpsConsoleEpic28 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ActorEmail",
                schema: "public",
                table: "platform_audit_logs",
                type: "character varying(320)",
                maxLength: 320,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "support_issue_replies",
                schema: "public",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SupportIssueId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ActorEmail = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    Body = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_support_issue_replies", x => x.Id);
                    table.ForeignKey(
                        name: "FK_support_issue_replies_support_issues_SupportIssueId",
                        column: x => x.SupportIssueId,
                        principalSchema: "public",
                        principalTable: "support_issues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_support_issue_replies_SupportIssueId",
                schema: "public",
                table: "support_issue_replies",
                column: "SupportIssueId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "support_issue_replies",
                schema: "public");

            migrationBuilder.DropColumn(
                name: "ActorEmail",
                schema: "public",
                table: "platform_audit_logs");
        }
    }
}
