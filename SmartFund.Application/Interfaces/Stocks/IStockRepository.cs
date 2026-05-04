using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.Application.Interfaces.Stocks
{
    public interface IStockRepository
    {
        Task<List<Stock>> GetAllAsync(CancellationToken ct);
        Task<Stock?> GetByTickerAsync(string ticker, CancellationToken ct);
        Task AddAsync(Stock stock, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
