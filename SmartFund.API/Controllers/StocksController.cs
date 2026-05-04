using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.Application.Interfaces.Stocks;
using SmartFund.API.Infrastructure;
using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/stocks")]
    public sealed class StocksController : SmartFundControllerBase
    {
        private readonly IStockRepository _stocks;
        private readonly IPriceRepository _prices;
        private readonly IAiBriefRepository _briefs;
        private readonly IAiBriefOrchestrator _orchestrator;
        private readonly ILogger<StocksController> _logger;

        public StocksController(
            IStockRepository stocks,
            IPriceRepository prices,
            IAiBriefRepository briefs,
            IAiBriefOrchestrator orchestrator,
            ILogger<StocksController> logger)
        {
            _stocks = stocks;
            _prices = prices;
            _briefs = briefs;
            _orchestrator = orchestrator;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            var stocks = await _stocks.GetAllAsync(ct);
            return Ok(stocks.Select(s => new
            {
                s.Ticker,
                s.TradingViewSymbol,
                s.CompanyName,
                s.Sector
            }));
        }

        [HttpGet("{ticker}/history")]
        public async Task<IActionResult> History(string ticker, [FromQuery] int days = 60, CancellationToken ct = default)
        {
            var stock = await _stocks.GetByTickerAsync(ticker, ct);
            if (stock is null) return NotFound(new { error = $"Ticker '{ticker}' not found." });

            var entries = await _prices.GetByTickerAsync(ticker, days, ct);
            return Ok(new
            {
                stock.Ticker,
                stock.CompanyName,
                stock.TradingViewSymbol,
                entries = entries.Select(e => new
                {
                    e.Id,
                    tradeDate = e.TradeDate.ToString("yyyy-MM-dd"),
                    e.Open,
                    e.High,
                    e.Low,
                    e.Close,
                    e.Volume,
                    e.UpdatedAtUtc
                })
            });
        }

        [HttpGet("{ticker}/brief")]
        public async Task<IActionResult> GetBrief(string ticker, CancellationToken ct)
        {
            var brief = await _briefs.GetLatestByTickerAsync(ticker, ct);
            if (brief is null) return NotFound(new { error = "No brief available yet. Add price entries first." });

            return Ok(new
            {
                brief.Ticker,
                brief.GeneratedAtUtc,
                brief.RsiValue,
                brief.RsiSignal,
                brief.MacdSignal,
                brief.PriceVsSma20,
                brief.PriceVsSma50,
                brief.NewsSentiment,
                brief.BriefText
            });
        }

        [HttpPost("{ticker}/brief/regenerate")]
        public async Task<IActionResult> RegenerateBrief(string ticker, CancellationToken ct)
        {
            var stock = await _stocks.GetByTickerAsync(ticker, ct);
            if (stock is null) return NotFound(new { error = $"Ticker '{ticker}' not found." });

            _ = Task.Run(async () =>
            {
                try { await _orchestrator.GenerateBriefAsync(ticker); }
                catch (Exception ex) { _logger.LogError(ex, "Failed to regenerate AI brief for {Ticker}", ticker); }
            }, CancellationToken.None);

            return Accepted(new { message = $"Brief regeneration queued for {ticker}." });
        }

        [HttpPost]
        public async Task<IActionResult> AddStock([FromBody] AddStockRequest request, CancellationToken ct)
        {
            var ticker = request.Ticker?.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(ticker))
                return BadRequest(new { error = "Ticker is required." });

            var existing = await _stocks.GetByTickerAsync(ticker, ct);
            if (existing is not null) return Conflict(new { error = $"Ticker '{ticker}' already exists." });

            var tvSymbol = string.IsNullOrWhiteSpace(request.TradingViewSymbol)
                ? $"NSENG:{ticker}"
                : request.TradingViewSymbol.Trim();

            var stock = Stock.Create(ticker, tvSymbol, request.CompanyName ?? ticker, request.Sector);
            await _stocks.AddAsync(stock, ct);
            await _stocks.SaveChangesAsync(ct);

            return Ok(new { stock.Ticker, stock.TradingViewSymbol, stock.CompanyName });
        }

        public sealed class AddStockRequest
        {
            public string? Ticker { get; set; }
            public string? TradingViewSymbol { get; set; }
            public string? CompanyName { get; set; }
            public string? Sector { get; set; }
        }
    }
}
