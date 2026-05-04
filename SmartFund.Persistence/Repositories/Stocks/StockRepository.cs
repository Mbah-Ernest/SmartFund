using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces.Stocks;
using SmartFund.Domain.Stocks.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories.Stocks
{
    public sealed class StockRepository : IStockRepository
    {
        private readonly SmartFundDbContext _db;

        public StockRepository(SmartFundDbContext db) => _db = db;

        public Task<List<Stock>> GetAllAsync(CancellationToken ct) =>
            _db.Stocks.OrderBy(x => x.Ticker).ToListAsync(ct);

        public Task<Stock?> GetByTickerAsync(string ticker, CancellationToken ct) =>
            _db.Stocks.FirstOrDefaultAsync(x => x.Ticker == ticker.ToUpperInvariant(), ct);

        public Task AddAsync(Stock stock, CancellationToken ct) =>
            _db.Stocks.AddAsync(stock, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
