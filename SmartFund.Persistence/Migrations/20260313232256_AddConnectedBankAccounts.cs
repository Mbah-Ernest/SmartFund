using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddConnectedBankAccounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ConnectedBankAccounts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MonoAccountId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    BankName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AccountNumber = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    AccountName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AccountType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Currency = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    LastKnownBalanceKobo = table.Column<long>(type: "bigint", nullable: false),
                    LastSyncedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ConnectedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ConnectedBankAccounts", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ConnectedBankAccounts_ConnectedAtUtc",
                table: "ConnectedBankAccounts",
                column: "ConnectedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_ConnectedBankAccounts_MonoAccountId",
                table: "ConnectedBankAccounts",
                column: "MonoAccountId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ConnectedBankAccounts");
        }
    }
}
