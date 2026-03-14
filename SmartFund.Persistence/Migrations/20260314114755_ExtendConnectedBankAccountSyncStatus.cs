using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExtendConnectedBankAccountSyncStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LastSyncError",
                table: "ConnectedBankAccounts",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "SyncStatus",
                table: "ConnectedBankAccounts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TotalTransactionsSynced",
                table: "ConnectedBankAccounts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "BankCategorizationRules",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MatchText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IsRegex = table.Column<bool>(type: "bit", nullable: false),
                    CaseSensitive = table.Column<bool>(type: "bit", nullable: false),
                    CategoryId = table.Column<long>(type: "bigint", nullable: false),
                    TransactionType = table.Column<int>(type: "int", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    AutoPostCredits = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastMatchedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MatchCount = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankCategorizationRules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BankCategorizationRules_PersonalCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "PersonalCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BankImportedTransactions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ConnectedBankAccountId = table.Column<long>(type: "bigint", nullable: false),
                    MonoTransactionId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    IdempotencyHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AmountKobo = table.Column<long>(type: "bigint", nullable: false),
                    Direction = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    RawNarration = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    NormalizedNarration = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ExtractedMerchant = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    TransactionDateUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ImportedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsPending = table.Column<bool>(type: "bit", nullable: false),
                    IsReversal = table.Column<bool>(type: "bit", nullable: false),
                    ReversalOfMonoId = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    LinkedPersonalTransactionId = table.Column<long>(type: "bigint", nullable: true),
                    TransferPairImportId = table.Column<long>(type: "bigint", nullable: true),
                    ReviewNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ReviewedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankImportedTransactions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BankImportedTransactions_ConnectedBankAccounts_ConnectedBankAccountId",
                        column: x => x.ConnectedBankAccountId,
                        principalTable: "ConnectedBankAccounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BankImportedTransactions_PersonalTransactions_LinkedPersonalTransactionId",
                        column: x => x.LinkedPersonalTransactionId,
                        principalTable: "PersonalTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BankCategorizationRules_CategoryId",
                table: "BankCategorizationRules",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_BankCategorizationRules_IsActive_Priority",
                table: "BankCategorizationRules",
                columns: new[] { "IsActive", "Priority" });

            migrationBuilder.CreateIndex(
                name: "IX_BankImportedTransactions_ConnectedBankAccountId",
                table: "BankImportedTransactions",
                column: "ConnectedBankAccountId");

            migrationBuilder.CreateIndex(
                name: "IX_BankImportedTransactions_IdempotencyHash",
                table: "BankImportedTransactions",
                column: "IdempotencyHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BankImportedTransactions_LinkedPersonalTransactionId",
                table: "BankImportedTransactions",
                column: "LinkedPersonalTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_BankImportedTransactions_MonoTransactionId_ConnectedBankAccountId",
                table: "BankImportedTransactions",
                columns: new[] { "MonoTransactionId", "ConnectedBankAccountId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BankImportedTransactions_Status_ImportedAtUtc",
                table: "BankImportedTransactions",
                columns: new[] { "Status", "ImportedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BankCategorizationRules");

            migrationBuilder.DropTable(
                name: "BankImportedTransactions");

            migrationBuilder.DropColumn(
                name: "LastSyncError",
                table: "ConnectedBankAccounts");

            migrationBuilder.DropColumn(
                name: "SyncStatus",
                table: "ConnectedBankAccounts");

            migrationBuilder.DropColumn(
                name: "TotalTransactionsSynced",
                table: "ConnectedBankAccounts");
        }
    }
}
