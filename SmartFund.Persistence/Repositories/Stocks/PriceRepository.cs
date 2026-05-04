using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces.Stocks;
using SmartFund.Domain.Stocks.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories.Stocks
{
    public sealed class PriceRepository : IPriceRepository
    {
        private readonly SmartFundDbContext _db;

        public PriceRepository(SmartFundDbContext db) => _db = db;

        public Task AddAsync(PriceEntry entry, CancellationToken ct) =>
            _db.StockPriceEntries.AddAsync(entry, ct).AsTask();

        public Task<PriceEntry?> GetByTickerAndDateAsync(string ticker, DateTime tradeDate, CancellationToken ct) =>
            _db.StockPriceEntries.FirstOrDefaultAsync(
                x => x.Ticker == ticker.ToUpperInvariant() && x.TradeDate == tradeDate.Date,
                ct);

        public Task<PriceEntry?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.StockPriceEntries.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<PriceEntry>> GetByTickerAsync(string ticker, int days, CancellationToken ct)
        {
            var cutoff = DateTime.UtcNow.Date.AddDays(-days);
            return _db.StockPriceEntries
                .Where(x => x.Ticker == ticker.ToUpperInvariant() && x.TradeDate >= cutoff)
                .OrderByDescending(x => x.TradeDate)
                .ToListAsync(ct);
        }

        public Task DeleteAsync(PriceEntry entry, CancellationToken ct)
        {
            _db.StockPriceEntries.Remove(entry);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
