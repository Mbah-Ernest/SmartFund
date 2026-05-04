using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.Application.Interfaces.Stocks;
using SmartFund.API.Infrastructure;
using SmartFund.Domain.Stocks.Entities;
using SmartFund.Domain.Exceptions;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/stock-watchlist")]
    public sealed class StockWatchlistController : SmartFundControllerBase
    {
        private readonly IStockWatchlistRepository _watchlist;
        private readonly IStockRepository _stocks;
        private readonly IPriceRepository _prices;
        private readonly IAiBriefRepository _briefs;

        public StockWatchlistController(
            IStockWatchlistRepository watchlist,
            IStockRepository stocks,
            IPriceRepository prices,
            IAiBriefRepository briefs)
        {
            _watchlist = watchlist;
            _stocks = stocks;
            _prices = prices;
            _briefs = briefs;
        }

        [HttpGet]
        public async Task<IActionResult> GetWatchlist(CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var entries = await _watchlist.GetByUserAsync(userId, ct);

            var result = new List<object>();
            foreach (var entry in entries)
            {
                var stock = await _stocks.GetByTickerAsync(entry.Ticker, ct);
                var history = await _prices.GetByTickerAsync(entry.Ticker, 2, ct);
                var brief = await _briefs.GetLatestByTickerAsync(entry.Ticker, ct);

                decimal? latestClose = history.FirstOrDefault()?.Close;
                decimal? prevClose = history.Count >= 2 ? history[1].Close : null;
                decimal? dailyChangePct = latestClose.HasValue && prevClose.HasValue && prevClose.Value != 0
                    ? Math.Round((latestClose.Value - prevClose.Value) / prevClose.Value * 100, 2)
                    : null;

                decimal? pl = entry.HoldingsQty.HasValue && entry.AvgCost.HasValue && latestClose.HasValue
                    ? Math.Round((latestClose.Value - entry.AvgCost.Value) * entry.HoldingsQty.Value, 2)
                    : null;

                result.Add(new
                {
                    entry.Id,
                    entry.Ticker,
                    companyName = stock?.CompanyName,
                    tradingViewSymbol = stock?.TradingViewSymbol,
                    latestClose,
                    dailyChangePct,
                    entry.HoldingsQty,
                    entry.AvgCost,
                    profitLoss = pl,
                    rsiSignal = brief?.RsiSignal,
                    macdSignal = brief?.MacdSignal,
                    briefGeneratedAt = brief?.GeneratedAtUtc
                });
            }

            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Add([FromBody] AddWatchlistRequest request, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var ticker = request.Ticker?.Trim().ToUpperInvariant();

            if (string.IsNullOrWhiteSpace(ticker))
                return BadRequest(new { error = "Ticker is required." });

            var stock = await _stocks.GetByTickerAsync(ticker, ct);
            if (stock is null) return NotFound(new { error = $"Ticker '{ticker}' not found in the system." });

            var existing = await _watchlist.GetEntryAsync(userId, ticker, ct);
            if (existing is not null) return Conflict(new { error = $"'{ticker}' is already on your watchlist." });

            var entry = StockWatchlistEntry.Create(userId, ticker, request.HoldingsQty, request.AvgCost);
            await _watchlist.AddAsync(entry, ct);
            await _watchlist.SaveChangesAsync(ct);

            return Ok(new { entry.Id, entry.Ticker });
        }

        [HttpDelete("{ticker}")]
        public async Task<IActionResult> Remove(string ticker, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var entry = await _watchlist.GetEntryAsync(userId, ticker, ct);
            if (entry is null) return NotFound(new { error = $"'{ticker}' not found on your watchlist." });

            await _watchlist.RemoveAsync(entry, ct);
            await _watchlist.SaveChangesAsync(ct);
            return Ok(new { removed = ticker });
        }

        [HttpPatch("{ticker}")]
        public async Task<IActionResult> UpdateHoldings(string ticker, [FromBody] UpdateHoldingsRequest request, CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var entry = await _watchlist.GetEntryAsync(userId, ticker, ct);
            if (entry is null) return NotFound(new { error = $"'{ticker}' not found on your watchlist." });

            entry.UpdateHoldings(request.HoldingsQty, request.AvgCost);
            await _watchlist.SaveChangesAsync(ct);
            return Ok(new { entry.Ticker, entry.HoldingsQty, entry.AvgCost });
        }

        public sealed class AddWatchlistRequest
        {
            public string? Ticker { get; set; }
            public decimal? HoldingsQty { get; set; }
            public decimal? AvgCost { get; set; }
        }

        public sealed class UpdateHoldingsRequest
        {
            public decimal? HoldingsQty { get; set; }
            public decimal? AvgCost { get; set; }
        }
    }
}
