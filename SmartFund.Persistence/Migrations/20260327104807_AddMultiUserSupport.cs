using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiUserSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Drop old table and old unique indexes first
            migrationBuilder.DropTable(
                name: "PersonalInvestmentContributions");

            migrationBuilder.DropIndex(
                name: "IX_PersonalCategories_Type_Name",
                table: "PersonalCategories");

            migrationBuilder.DropIndex(
                name: "IX_PersonalBudgets_CategoryId_Period",
                table: "PersonalBudgets");

            // 2. Create Users table BEFORE adding UserId columns so FK constraints work
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Role = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            // 3. Seed admin user (BCrypt hash of "admin", workFactor: 12)
            migrationBuilder.Sql(@"
                SET IDENTITY_INSERT Users ON;
                INSERT INTO Users (Id, Email, PasswordHash, FullName, Role, CreatedAtUtc, IsActive)
                VALUES (1, 'admin@smartfund.com', '$2a$12$K26nlZkoTJVtZL.ckAnLuuqxpvmFp3oh18vyWVu8BFXvzYv/eEc5C', 'Administrator', 1, GETUTCDATE(), 1);
                SET IDENTITY_INSERT Users OFF;
            ");

            // 4. Add UserId columns — defaultValue: 1L so existing rows belong to the seeded admin
            migrationBuilder.AddColumn<long>(
                name: "UserId",
                table: "PersonalWallets",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            migrationBuilder.AddColumn<long>(
                name: "UserId",
                table: "PersonalTransactions",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            migrationBuilder.AddColumn<long>(
                name: "UserId",
                table: "PersonalGoals",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            // Alter PersonalFinanceSettings.Id from int to bigint
            // SQL Server requires dropping the PK before changing its column type
            migrationBuilder.Sql("ALTER TABLE [PersonalFinanceSettings] DROP CONSTRAINT [PK_PersonalFinanceSettings]");
            migrationBuilder.Sql("ALTER TABLE [PersonalFinanceSettings] ALTER COLUMN [Id] bigint NOT NULL");
            migrationBuilder.Sql("ALTER TABLE [PersonalFinanceSettings] ADD CONSTRAINT [PK_PersonalFinanceSettings] PRIMARY KEY ([Id])");

            migrationBuilder.AddColumn<long>(
                name: "UserId",
                table: "PersonalFinanceSettings",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            migrationBuilder.AddColumn<long>(
                name: "UserId",
                table: "PersonalCategories",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            migrationBuilder.AddColumn<long>(
                name: "UserId",
                table: "PersonalBudgets",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            migrationBuilder.AddColumn<long>(
                name: "UserId",
                table: "ConnectedBankAccounts",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            migrationBuilder.AddColumn<long>(
                name: "UserId",
                table: "BankCategorizationRules",
                type: "bigint",
                nullable: false,
                defaultValue: 1L);

            // PendingAgentActions may already exist if it was created outside migrations
            migrationBuilder.Sql(@"
                IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PendingAgentActions' AND xtype='U')
                BEGIN
                    CREATE TABLE [PendingAgentActions] (
                        [Id] uniqueidentifier NOT NULL,
                        [UserId] nvarchar(200) NOT NULL,
                        [ActionType] nvarchar(100) NOT NULL,
                        [PayloadJson] nvarchar(4000) NOT NULL,
                        [Summary] nvarchar(500) NOT NULL,
                        [CreatedAtUtc] datetime2 NOT NULL,
                        [ExpiresAtUtc] datetime2 NOT NULL,
                        CONSTRAINT [PK_PendingAgentActions] PRIMARY KEY ([Id])
                    );
                    CREATE INDEX [IX_PendingAgentActions_ExpiresAtUtc] ON [PendingAgentActions] ([ExpiresAtUtc]);
                    CREATE INDEX [IX_PendingAgentActions_UserId] ON [PendingAgentActions] ([UserId]);
                END
            ");

            migrationBuilder.CreateTable(
                name: "LoanApplications",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    PurposeCategory = table.Column<int>(type: "int", nullable: false),
                    PurposeDescription = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    EmploymentStatus = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    MonthlyIncome = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    LoanTermMonths = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ReviewedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedByUserId = table.Column<long>(type: "bigint", nullable: true),
                    AdminNote = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_LoanApplications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_LoanApplications_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_LoanApplications_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PersonalWallets_UserId",
                table: "PersonalWallets",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalTransactions_UserId",
                table: "PersonalTransactions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalGoals_UserId",
                table: "PersonalGoals",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalFinanceSettings_UserId",
                table: "PersonalFinanceSettings",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PersonalCategories_UserId",
                table: "PersonalCategories",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalCategories_UserId_Type_Name",
                table: "PersonalCategories",
                columns: new[] { "UserId", "Type", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PersonalBudgets_CategoryId",
                table: "PersonalBudgets",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalBudgets_UserId",
                table: "PersonalBudgets",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalBudgets_UserId_CategoryId_Period",
                table: "PersonalBudgets",
                columns: new[] { "UserId", "CategoryId", "Period" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ConnectedBankAccounts_UserId",
                table: "ConnectedBankAccounts",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_BankCategorizationRules_UserId",
                table: "BankCategorizationRules",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_LoanApplications_ReviewedByUserId",
                table: "LoanApplications",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_LoanApplications_Status",
                table: "LoanApplications",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_LoanApplications_UserId",
                table: "LoanApplications",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_BankCategorizationRules_Users_UserId",
                table: "BankCategorizationRules",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ConnectedBankAccounts_Users_UserId",
                table: "ConnectedBankAccounts",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PersonalBudgets_Users_UserId",
                table: "PersonalBudgets",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PersonalCategories_Users_UserId",
                table: "PersonalCategories",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PersonalFinanceSettings_Users_UserId",
                table: "PersonalFinanceSettings",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PersonalGoals_Users_UserId",
                table: "PersonalGoals",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PersonalTransactions_Users_UserId",
                table: "PersonalTransactions",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PersonalWallets_Users_UserId",
                table: "PersonalWallets",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BankCategorizationRules_Users_UserId",
                table: "BankCategorizationRules");

            migrationBuilder.DropForeignKey(
                name: "FK_ConnectedBankAccounts_Users_UserId",
                table: "ConnectedBankAccounts");

            migrationBuilder.DropForeignKey(
                name: "FK_PersonalBudgets_Users_UserId",
                table: "PersonalBudgets");

            migrationBuilder.DropForeignKey(
                name: "FK_PersonalCategories_Users_UserId",
                table: "PersonalCategories");

            migrationBuilder.DropForeignKey(
                name: "FK_PersonalFinanceSettings_Users_UserId",
                table: "PersonalFinanceSettings");

            migrationBuilder.DropForeignKey(
                name: "FK_PersonalGoals_Users_UserId",
                table: "PersonalGoals");

            migrationBuilder.DropForeignKey(
                name: "FK_PersonalTransactions_Users_UserId",
                table: "PersonalTransactions");

            migrationBuilder.DropForeignKey(
                name: "FK_PersonalWallets_Users_UserId",
                table: "PersonalWallets");

            migrationBuilder.DropTable(
                name: "LoanApplications");

            migrationBuilder.DropTable(
                name: "PendingAgentActions");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropIndex(
                name: "IX_PersonalWallets_UserId",
                table: "PersonalWallets");

            migrationBuilder.DropIndex(
                name: "IX_PersonalTransactions_UserId",
                table: "PersonalTransactions");

            migrationBuilder.DropIndex(
                name: "IX_PersonalGoals_UserId",
                table: "PersonalGoals");

            migrationBuilder.DropIndex(
                name: "IX_PersonalFinanceSettings_UserId",
                table: "PersonalFinanceSettings");

            migrationBuilder.DropIndex(
                name: "IX_PersonalCategories_UserId",
                table: "PersonalCategories");

            migrationBuilder.DropIndex(
                name: "IX_PersonalCategories_UserId_Type_Name",
                table: "PersonalCategories");

            migrationBuilder.DropIndex(
                name: "IX_PersonalBudgets_CategoryId",
                table: "PersonalBudgets");

            migrationBuilder.DropIndex(
                name: "IX_PersonalBudgets_UserId",
                table: "PersonalBudgets");

            migrationBuilder.DropIndex(
                name: "IX_PersonalBudgets_UserId_CategoryId_Period",
                table: "PersonalBudgets");

            migrationBuilder.DropIndex(
                name: "IX_ConnectedBankAccounts_UserId",
                table: "ConnectedBankAccounts");

            migrationBuilder.DropIndex(
                name: "IX_BankCategorizationRules_UserId",
                table: "BankCategorizationRules");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "PersonalWallets");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "PersonalTransactions");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "PersonalGoals");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "PersonalFinanceSettings");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "PersonalCategories");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "PersonalBudgets");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "ConnectedBankAccounts");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "BankCategorizationRules");

            migrationBuilder.Sql("ALTER TABLE [PersonalFinanceSettings] DROP CONSTRAINT [PK_PersonalFinanceSettings]");
            migrationBuilder.Sql("ALTER TABLE [PersonalFinanceSettings] ALTER COLUMN [Id] int NOT NULL");
            migrationBuilder.Sql("ALTER TABLE [PersonalFinanceSettings] ADD CONSTRAINT [PK_PersonalFinanceSettings] PRIMARY KEY ([Id])");

            migrationBuilder.CreateTable(
                name: "PersonalInvestmentContributions",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    LedgerTransactionId = table.Column<long>(type: "bigint", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    TrancheId = table.Column<long>(type: "bigint", nullable: false),
                    WalletId = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PersonalInvestmentContributions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PersonalInvestmentContributions_LedgerTransactions_LedgerTransactionId",
                        column: x => x.LedgerTransactionId,
                        principalTable: "LedgerTransactions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PersonalInvestmentContributions_PersonalWallets_WalletId",
                        column: x => x.WalletId,
                        principalTable: "PersonalWallets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PersonalInvestmentContributions_Tranches_TrancheId",
                        column: x => x.TrancheId,
                        principalTable: "Tranches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PersonalCategories_Type_Name",
                table: "PersonalCategories",
                columns: new[] { "Type", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PersonalBudgets_CategoryId_Period",
                table: "PersonalBudgets",
                columns: new[] { "CategoryId", "Period" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PersonalInvestmentContributions_LedgerTransactionId",
                table: "PersonalInvestmentContributions",
                column: "LedgerTransactionId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalInvestmentContributions_TrancheId",
                table: "PersonalInvestmentContributions",
                column: "TrancheId");

            migrationBuilder.CreateIndex(
                name: "IX_PersonalInvestmentContributions_WalletId",
                table: "PersonalInvestmentContributions",
                column: "WalletId");
        }
    }
}
