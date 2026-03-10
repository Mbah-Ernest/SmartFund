using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Tests.PersonalFinance.Fakes;

internal sealed class InMemoryLedgerTransactionRepository : ILedgerTransactionRepository
{
    private long _nextId = 1;

    public List<LedgerTransaction> Transactions { get; } = new();

    public Task<LedgerTransaction?> GetAsync(long id, CancellationToken ct) =>
        Task.FromResult(Transactions.FirstOrDefault(x => x.Id == id));

    public Task<List<LedgerTransaction>> ListAsync(CancellationToken ct) =>
        Task.FromResult(Transactions.OrderByDescending(x => x.Id).ToList());

    public Task AddAsync(LedgerTransaction tx, CancellationToken ct)
    {
        EntityId.Set(tx, _nextId++);
        Transactions.Add(tx);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

    public Task<decimal> GetPostedBalanceForAccountAsync(long accountId, CancellationToken ct)
    {
        // Matches current persistence behavior: include draft + posted.
        var entries = Transactions
            .Where(t => t.Status == TransactionStatus.Draft || t.Status == TransactionStatus.Posted)
            .SelectMany(t => t.Entries)
            .Where(e => e.AccountId == accountId);

        var debit = entries.Sum(e => e.Debit.Amount);
        var credit = entries.Sum(e => e.Credit.Amount);
        return Task.FromResult(debit - credit);
    }

    public Task<decimal> GetPostedNetForAccountAsync(long accountId, ReferenceType referenceType, long referenceId, CancellationToken ct)
    {
        var entries = Transactions
            .Where(t => t.Status == TransactionStatus.Posted && t.ReferenceType == referenceType && t.ReferenceId == referenceId)
            .SelectMany(t => t.Entries)
            .Where(e => e.AccountId == accountId);

        var credit = entries.Sum(e => e.Credit.Amount);
        var debit = entries.Sum(e => e.Debit.Amount);
        return Task.FromResult(credit - debit);
    }
}
