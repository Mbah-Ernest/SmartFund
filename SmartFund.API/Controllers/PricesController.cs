using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.Application.Interfaces.Stocks;
using SmartFund.API.Infrastructure;
using SmartFund.Domain.Stocks.Entities;
using System.Globalization;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/prices")]
    public sealed class PricesController : SmartFundControllerBase
    {
        private readonly IPriceRepository _prices;
        private readonly IStockRepository _stocks;
        private readonly IAiBriefOrchestrator _orchestrator;
        private readonly ILogger<PricesController> _logger;

        public PricesController(
            IPriceRepository prices,
            IStockRepository stocks,
            IAiBriefOrchestrator orchestrator,
            ILogger<PricesController> logger)
        {
            _prices = prices;
            _stocks = stocks;
            _orchestrator = orchestrator;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> SavePrice([FromBody] SavePriceRequest request, CancellationToken ct)
        {
            if (!DateTime.TryParse(request.Date, out var tradeDate))
                return BadRequest(new { error = "Invalid date format. Use yyyy-MM-dd." });

            var ticker = request.Ticker?.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(ticker))
                return BadRequest(new { error = "Ticker is required." });

            var stock = await _stocks.GetByTickerAsync(ticker, ct);
            if (stock is null) return NotFound(new { error = $"Ticker '{ticker}' not found. Add it to stocks first." });

            var existing = await _prices.GetByTickerAndDateAsync(ticker, tradeDate, ct);

            long entryId;
            if (existing is not null)
            {
                existing.Update(request.Open, request.High, request.Low, request.Close, request.Volume);
                entryId = existing.Id;
            }
            else
            {
                var entry = PriceEntry.Create(ticker, tradeDate, request.Open, request.High, request.Low, request.Close, request.Volume);
                await _prices.AddAsync(entry, ct);
                await _prices.SaveChangesAsync(ct);
                entryId = entry.Id;
            }

            if (existing is not null)
                await _prices.SaveChangesAsync(ct);

            // Fire-and-forget AI brief regeneration
            _ = Task.Run(async () =>
            {
                try
                {
                    await _orchestrator.GenerateBriefAsync(ticker);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to generate AI brief for {Ticker}", ticker);
                }
            }, CancellationToken.None);

            return Ok(new { id = entryId, ticker, date = tradeDate.ToString("yyyy-MM-dd") });
        }

        [HttpPost("bulk")]
        public async Task<IActionResult> BulkImport([FromForm] BulkImportRequest request, CancellationToken ct)
        {
            var ticker = request.Ticker?.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(ticker))
                return BadRequest(new { error = "Ticker is required." });

            var stock = await _stocks.GetByTickerAsync(ticker, ct);
            if (stock is null) return NotFound(new { error = $"Ticker '{ticker}' not found." });

            if (request.File is null || request.File.Length == 0)
                return BadRequest(new { error = "CSV file is required." });

            using var reader = new StreamReader(request.File.OpenReadStream());
            var header = await reader.ReadLineAsync(ct); // skip header: date,open,high,low,close,volume

            int imported = 0, skipped = 0;
            var errors = new List<string>();

            while (!reader.EndOfStream)
            {
                var line = await reader.ReadLineAsync(ct);
                if (string.IsNullOrWhiteSpace(line)) continue;

                var parts = line.Split(',');
                if (parts.Length < 6)
                {
                    errors.Add($"Invalid row: {line}");
                    continue;
                }

                try
                {
                    var date = DateTime.Parse(parts[0].Trim(), CultureInfo.InvariantCulture);
                    var open = decimal.Parse(parts[1].Trim(), CultureInfo.InvariantCulture);
                    var high = decimal.Parse(parts[2].Trim(), CultureInfo.InvariantCulture);
                    var low = decimal.Parse(parts[3].Trim(), CultureInfo.InvariantCulture);
                    var close = decimal.Parse(parts[4].Trim(), CultureInfo.InvariantCulture);
                    var volume = long.Parse(parts[5].Trim(), CultureInfo.InvariantCulture);

                    var existing = await _prices.GetByTickerAndDateAsync(ticker, date, ct);
                    if (existing is not null)
                    {
                        existing.Update(open, high, low, close, volume);
                        skipped++;
                    }
                    else
                    {
                        var entry = PriceEntry.Create(ticker, date, open, high, low, close, volume);
                        await _prices.AddAsync(entry, ct);
                        imported++;
                    }
                }
                catch (Exception ex)
                {
                    errors.Add($"Row error: {line} — {ex.Message}");
                }
            }

            await _prices.SaveChangesAsync(ct);

            if (imported > 0 || skipped > 0)
            {
                _ = Task.Run(async () =>
                {
                    try { await _orchestrator.GenerateBriefAsync(ticker); }
                    catch (Exception ex) { _logger.LogError(ex, "Failed to generate AI brief for {Ticker}", ticker); }
                }, CancellationToken.None);
            }

            return Ok(new { imported, updated = skipped, errors });
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            var entry = await _prices.GetByIdAsync(id, ct);
            if (entry is null) return NotFound(new { error = "Price entry not found." });

            await _prices.DeleteAsync(entry, ct);
            await _prices.SaveChangesAsync(ct);
            return Ok(new { deleted = id });
        }

        public sealed class SavePriceRequest
        {
            public string? Ticker { get; set; }
            public string? Date { get; set; }
            public decimal Open { get; set; }
            public decimal High { get; set; }
            public decimal Low { get; set; }
            public decimal Close { get; set; }
            public long Volume { get; set; }
        }

        public sealed class BulkImportRequest
        {
            public string? Ticker { get; set; }
            public IFormFile? File { get; set; }
        }
    }
}
