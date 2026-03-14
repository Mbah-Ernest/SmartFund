using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    /// <summary>Abstraction over the Mono HTTP API. Implementation lives in Infrastructure.</summary>
    public interface IMonoApiClient
    {
        Task<string> ExchangeCodeAsync(string authCode, CancellationToken ct);
        Task<MonoAccountInfo> GetAccountInfoAsync(string monoAccountId, CancellationToken ct);
        Task<List<MonoTransaction>> GetTransactionsAsync(string monoAccountId, DateTime? since, CancellationToken ct);
        Task<string> GenerateConnectTokenAsync(CancellationToken ct);
    }

    public sealed class MonoAccountInfo
    {
        public string MonoAccountId { get; init; } = string.Empty;
        public string BankName { get; init; } = string.Empty;
        public string AccountNumber { get; init; } = string.Empty;
        public string AccountName { get; init; } = string.Empty;
        public string AccountType { get; init; } = string.Empty;
        public string Currency { get; init; } = "NGN";
        public long BalanceKobo { get; init; }
    }

    public sealed class MonoTransaction
    {
        public string Id { get; init; } = string.Empty;
        public string Narration { get; init; } = string.Empty;
        public long Amount { get; init; }
        public string Type { get; init; } = string.Empty;
        public DateTime Date { get; init; }
        public bool Pending { get; init; }
    }
}
