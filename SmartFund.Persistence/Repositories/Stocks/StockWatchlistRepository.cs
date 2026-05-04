using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces.Stocks;
using SmartFund.Domain.Stocks.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories.Stocks
{
    public sealed class StockWatchlistRepository : IStockWatchlistRepository
    {
        private readonly SmartFundDbContext _db;

        public StockWatchlistRepository(SmartFundDbContext db) => _db = db;

        public Task<List<StockWatchlistEntry>> GetByUserAsync(long userId, CancellationToken ct) =>
            _db.StockWatchlistEntries
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.Ticker)
                .ToListAsync(ct);

        public Task<StockWatchlistEntry?> GetEntryAsync(long userId, string ticker, CancellationToken ct) =>
            _db.StockWatchlistEntries.FirstOrDefaultAsync(
                x => x.UserId == userId && x.Ticker == ticker.ToUpperInvariant(), ct);

        public Task AddAsync(StockWatchlistEntry entry, CancellationToken ct) =>
            _db.StockWatchlistEntries.AddAsync(entry, ct).AsTask();

        public Task RemoveAsync(StockWatchlistEntry entry, CancellationToken ct)
        {
            _db.StockWatchlistEntries.Remove(entry);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
