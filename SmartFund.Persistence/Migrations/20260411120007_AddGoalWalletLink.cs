using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGoalWalletLink : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<long>(
                name: "WalletId",
                table: "PersonalGoals",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PersonalGoals_WalletId",
                table: "PersonalGoals",
                column: "WalletId");

            migrationBuilder.AddForeignKey(
                name: "FK_PersonalGoals_PersonalWallets_WalletId",
                table: "PersonalGoals",
                column: "WalletId",
                principalTable: "PersonalWallets",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PersonalGoals_PersonalWallets_WalletId",
                table: "PersonalGoals");

            migrationBuilder.DropIndex(
                name: "IX_PersonalGoals_WalletId",
                table: "PersonalGoals");

            migrationBuilder.DropColumn(
                name: "WalletId",
                table: "PersonalGoals");
        }
    }
}
