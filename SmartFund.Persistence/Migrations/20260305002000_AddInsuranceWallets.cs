using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddInsuranceWallets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InsuranceWallets",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Balance = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    DealId = table.Column<long>(type: "bigint", nullable: true),
                    ReserveAccountId = table.Column<long>(type: "bigint", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InsuranceWallets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InsuranceWallets_Deals_DealId",
                        column: x => x.DealId,
                        principalTable: "Deals",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InsuranceWallets_LedgerAccounts_ReserveAccountId",
                        column: x => x.ReserveAccountId,
                        principalTable: "LedgerAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InsuranceWallets_DealId",
                table: "InsuranceWallets",
                column: "DealId");

            migrationBuilder.CreateIndex(
                name: "IX_InsuranceWallets_ReserveAccountId",
                table: "InsuranceWallets",
                column: "ReserveAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_InsuranceWallets_Type_DealId",
                table: "InsuranceWallets",
                columns: new[] { "Type", "DealId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InsuranceWallets");
        }
    }
}
