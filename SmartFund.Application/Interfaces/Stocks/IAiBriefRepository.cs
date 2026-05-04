using SmartFund.Domain.Stocks.Entities;

namespace SmartFund.Application.Interfaces.Stocks
{
    public interface IAiBriefRepository
    {
        Task<AiBrief?> GetLatestByTickerAsync(string ticker, CancellationToken ct);
        Task AddAsync(AiBrief brief, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
