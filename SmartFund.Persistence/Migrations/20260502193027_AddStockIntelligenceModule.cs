using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartFund.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStockIntelligenceModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Stocks",
                columns: table => new
                {
                    Ticker = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TradingViewSymbol = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    CompanyName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Sector = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Stocks", x => x.Ticker);
                });

            migrationBuilder.CreateTable(
                name: "StockAiBriefs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Ticker = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    GeneratedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RsiValue = table.Column<decimal>(type: "decimal(8,4)", nullable: true),
                    RsiSignal = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    MacdSignal = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PriceVsSma20 = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    PriceVsSma50 = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NewsSentiment = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    BriefText = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockAiBriefs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockAiBriefs_Stocks_Ticker",
                        column: x => x.Ticker,
                        principalTable: "Stocks",
                        principalColumn: "Ticker",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StockPriceEntries",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Ticker = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    TradeDate = table.Column<DateTime>(type: "date", nullable: false),
                    Open = table.Column<decimal>(type: "decimal(18,6)", nullable: false),
                    High = table.Column<decimal>(type: "decimal(18,6)", nullable: false),
                    Low = table.Column<decimal>(type: "decimal(18,6)", nullable: false),
                    Close = table.Column<decimal>(type: "decimal(18,6)", nullable: false),
                    Volume = table.Column<long>(type: "bigint", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockPriceEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockPriceEntries_Stocks_Ticker",
                        column: x => x.Ticker,
                        principalTable: "Stocks",
                        principalColumn: "Ticker",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "StockWatchlistEntries",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<long>(type: "bigint", nullable: false),
                    Ticker = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    HoldingsQty = table.Column<decimal>(type: "decimal(18,6)", nullable: true),
                    AvgCost = table.Column<decimal>(type: "decimal(18,6)", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockWatchlistEntries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_StockWatchlistEntries_Stocks_Ticker",
                        column: x => x.Ticker,
                        principalTable: "Stocks",
                        principalColumn: "Ticker",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_StockWatchlistEntries_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StockAiBriefs_Ticker_GeneratedAtUtc",
                table: "StockAiBriefs",
                columns: new[] { "Ticker", "GeneratedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_StockPriceEntries_Ticker",
                table: "StockPriceEntries",
                column: "Ticker");

            migrationBuilder.CreateIndex(
                name: "IX_StockPriceEntries_Ticker_TradeDate",
                table: "StockPriceEntries",
                columns: new[] { "Ticker", "TradeDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_StockWatchlistEntries_Ticker",
                table: "StockWatchlistEntries",
                column: "Ticker");

            migrationBuilder.CreateIndex(
                name: "IX_StockWatchlistEntries_UserId",
                table: "StockWatchlistEntries",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_StockWatchlistEntries_UserId_Ticker",
                table: "StockWatchlistEntries",
                columns: new[] { "UserId", "Ticker" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockAiBriefs");

            migrationBuilder.DropTable(
                name: "StockPriceEntries");

            migrationBuilder.DropTable(
                name: "StockWatchlistEntries");

            migrationBuilder.DropTable(
                name: "Stocks");
        }
    }
}
