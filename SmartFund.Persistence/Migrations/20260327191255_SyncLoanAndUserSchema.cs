using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SyncLoanAndUserSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "EmploymentStatus",
                table: "LoanApplications");

            migrationBuilder.RenameColumn(
                name: "MonthlyIncome",
                table: "LoanApplications",
                newName: "TotalRepayable");

            migrationBuilder.RenameColumn(
                name: "LoanTermMonths",
                table: "LoanApplications",
                newName: "RepaymentInstallments");

            migrationBuilder.AddColumn<string>(
                name: "AccountNumber",
                table: "LoanApplications",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "DailyInterestRate",
                table: "LoanApplications",
                type: "decimal(9,4)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<int>(
                name: "DurationDays",
                table: "LoanApplications",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<decimal>(
                name: "InstallmentAmount",
                table: "LoanApplications",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "InterestAmount",
                table: "LoanApplications",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "LoanApplicantProfiles",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    SubmittedName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    PhoneNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    EmailAddress = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    EmergencyContactNumber = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedByUserId = table.Column<long>(type: "bigint", nullable: true),
                    AdminNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoanApplicantProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoanApplicantProfiles_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LoanApplicantProfiles_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_LoanApplicantProfiles_ReviewedByUserId",
                table: "LoanApplicantProfiles",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LoanApplicantProfiles_Status",
                table: "LoanApplicantProfiles",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LoanApplicantProfiles_UserId",
                table: "LoanApplicantProfiles",
                column: "UserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "LoanApplicantProfiles");

            migrationBuilder.DropColumn(
                name: "AccountNumber",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "DailyInterestRate",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "DurationDays",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "InstallmentAmount",
                table: "LoanApplications");

            migrationBuilder.DropColumn(
                name: "InterestAmount",
                table: "LoanApplications");

            migrationBuilder.RenameColumn(
                name: "TotalRepayable",
                table: "LoanApplications",
                newName: "MonthlyIncome");

            migrationBuilder.RenameColumn(
                name: "RepaymentInstallments",
                table: "LoanApplications",
                newName: "LoanTermMonths");

            migrationBuilder.AddColumn<string>(
                name: "EmploymentStatus",
                table: "LoanApplications",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");
        }
    }
}
