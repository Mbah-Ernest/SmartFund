namespace SmartFund.Application.Interfaces.Stocks
{
    public interface IAiBriefOrchestrator
    {
        Task GenerateBriefAsync(string ticker, CancellationToken ct = default);
    }
}
