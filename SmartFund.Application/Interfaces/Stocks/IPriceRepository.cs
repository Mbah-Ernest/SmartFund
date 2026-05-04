using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.Application.Interfaces.Stocks
{
    public interface IPriceRepository
    {
        Task AddAsync(PriceEntry entry, CancellationToken ct);
        Task<PriceEntry?> GetByTickerAndDateAsync(string ticker, DateTime tradeDate, CancellationToken ct);
        Task<PriceEntry?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<PriceEntry>> GetByTickerAsync(string ticker, int days, CancellationToken ct);
        Task DeleteAsync(PriceEntry entry, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
