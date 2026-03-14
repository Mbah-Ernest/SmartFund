using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBankWalletProvenanceAndSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "SourceBankImportedTransactionId",
                table: "PersonalTransactions",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "SourceConnectedBankAccountId",
                table: "PersonalTransactions",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "PersonalWalletId",
                table: "ConnectedBankAccounts",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PersonalFinanceSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LaunchDateUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastResetAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonalFinanceSettings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PersonalTransactions_SourceBankImportedTransactionId",
                table: "PersonalTransactions",
                column: "SourceBankImportedTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_ConnectedBankAccounts_PersonalWalletId",
                table: "ConnectedBankAccounts",
                column: "PersonalWalletId");

            migrationBuilder.AddForeignKey(
                name: "FK_ConnectedBankAccounts_PersonalWallets_PersonalWalletId",
                table: "ConnectedBankAccounts",
                column: "PersonalWalletId",
                principalTable: "PersonalWallets",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ConnectedBankAccounts_PersonalWallets_PersonalWalletId",
                table: "ConnectedBankAccounts");

            migrationBuilder.DropTable(
                name: "PersonalFinanceSettings");

            migrationBuilder.DropIndex(
                name: "IX_PersonalTransactions_SourceBankImportedTransactionId",
                table: "PersonalTransactions");

            migrationBuilder.DropIndex(
                name: "IX_ConnectedBankAccounts_PersonalWalletId",
                table: "ConnectedBankAccounts");

            migrationBuilder.DropColumn(
                name: "SourceBankImportedTransactionId",
                table: "PersonalTransactions");

            migrationBuilder.DropColumn(
                name: "SourceConnectedBankAccountId",
                table: "PersonalTransactions");

            migrationBuilder.DropColumn(
                name: "PersonalWalletId",
                table: "ConnectedBankAccounts");
        }
    }
}
