using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDeals : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Deals",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    DealCode = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    BorrowerName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    LoanAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    InterestRate = table.Column<decimal>(type: "decimal(9,6)", nullable: false),
                    TenureMonths = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Deals", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Deals_DealCode",
                table: "Deals",
                column: "DealCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Tranches_DealId",
                table: "Tranches",
                column: "DealId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tranches_Deals_DealId",
                table: "Tranches",
                column: "DealId",
                principalTable: "Deals",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tranches_Deals_DealId",
                table: "Tranches");

            migrationBuilder.DropIndex(
                name: "IX_Tranches_DealId",
                table: "Tranches");

            migrationBuilder.DropTable(
                name: "Deals");
        }
    }
}
