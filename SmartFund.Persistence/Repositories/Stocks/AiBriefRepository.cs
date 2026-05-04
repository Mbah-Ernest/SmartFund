using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces.Stocks;
using SmartFund.Domain.Stocks.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories.Stocks
{
    public sealed class AiBriefRepository : IAiBriefRepository
    {
        private readonly SmartFundDbContext _db;

        public AiBriefRepository(SmartFundDbContext db) => _db = db;

        public Task<AiBrief?> GetLatestByTickerAsync(string ticker, CancellationToken ct) =>
            _db.StockAiBriefs
                .Where(x => x.Ticker == ticker.ToUpperInvariant())
                .OrderByDescending(x => x.GeneratedAtUtc)
                .FirstOrDefaultAsync(ct);

        public Task AddAsync(AiBrief brief, CancellationToken ct) =>
            _db.StockAiBriefs.AddAsync(brief, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
