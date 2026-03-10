using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTranches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Tranches",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TrancheCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    InvestorId = table.Column<long>(type: "bigint", nullable: false),
                    DealId = table.Column<long>(type: "bigint", nullable: true),
                    Principal = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    RoiType = table.Column<int>(type: "int", nullable: false),
                    RoiRate = table.Column<decimal>(type: "decimal(9,6)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    MaturityDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    PayoutType = table.Column<int>(type: "int", nullable: false),
                    NoticeDays = table.Column<int>(type: "int", nullable: true),
                    EarlyWithdrawalPolicy = table.Column<int>(type: "int", nullable: false),
                    LiabilityAccountId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tranches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tranches_LedgerAccounts_LiabilityAccountId",
                        column: x => x.LiabilityAccountId,
                        principalTable: "LedgerAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tranches_LiabilityAccountId",
                table: "Tranches",
                column: "LiabilityAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_Tranches_TrancheCode",
                table: "Tranches",
                column: "TrancheCode",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Tranches");
        }
    }
}
