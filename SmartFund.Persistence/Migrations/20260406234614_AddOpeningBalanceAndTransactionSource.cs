using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOpeningBalanceAndTransactionSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "OpeningBalance",
                table: "PersonalWallets",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<DateTime>(
                name: "OpeningBalanceDate",
                table: "PersonalWallets",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Source",
                table: "PersonalTransactions",
                type: "int",
                nullable: false,
                defaultValue: 1);

            // Backfill: mark existing bank-imported transactions as BankSync (Source = 2)
            migrationBuilder.Sql(
                "UPDATE PersonalTransactions SET Source = 2 WHERE SourceBankImportedTransactionId IS NOT NULL;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OpeningBalance",
                table: "PersonalWallets");

            migrationBuilder.DropColumn(
                name: "OpeningBalanceDate",
                table: "PersonalWallets");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "PersonalTransactions");
        }
    }
}
