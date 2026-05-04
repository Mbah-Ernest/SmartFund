using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.Application.Interfaces.Stocks
{
    public interface IStockWatchlistRepository
    {
        Task<List<StockWatchlistEntry>> GetByUserAsync(long userId, CancellationToken ct);
        Task<StockWatchlistEntry?> GetEntryAsync(long userId, string ticker, CancellationToken ct);
        Task AddAsync(StockWatchlistEntry entry, CancellationToken ct);
        Task RemoveAsync(StockWatchlistEntry entry, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
