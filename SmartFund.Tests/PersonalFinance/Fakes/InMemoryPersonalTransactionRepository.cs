using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Tests.PersonalFinance.Fakes;

internal sealed class InMemoryPersonalTransactionRepository : IPersonalTransactionRepository
{
    private long _nextId = 1;

    public List<PersonalTransaction> Transactions { get; } = new();

    public Task<PersonalTransaction?> GetByIdAsync(long id, CancellationToken ct) =>
        Task.FromResult(Transactions.FirstOrDefault(x => x.Id == id));

    public Task<List<PersonalTransaction>> ListByWalletIdAsync(long walletId, CancellationToken ct) =>
        Task.FromResult(Transactions.Where(x => x.WalletId == walletId).ToList());

    public Task<List<PersonalTransaction>> ListAllAsync(CancellationToken ct) =>
        Task.FromResult(Transactions.OrderByDescending(x => x.Date).ToList());

    public Task<List<PersonalTransaction>> ListByDateRangeAsync(DateTime from, DateTime to, CancellationToken ct) =>
        Task.FromResult(Transactions
            .Where(t => t.Date.Date >= from.Date && t.Date.Date <= to.Date)
            .OrderByDescending(t => t.Date)
            .ToList());

    public Task<List<PersonalTransaction>> ListRecentAsync(int take, CancellationToken ct) =>
        Task.FromResult(Transactions
            .OrderByDescending(t => t.Date)
            .Take(take <= 0 ? 20 : take)
            .ToList());

    public Task AddAsync(PersonalTransaction tx, CancellationToken ct)
    {
        EntityId.Set(tx, _nextId++);
        Transactions.Add(tx);
        return Task.CompletedTask;
    }

    public Task<List<PersonalTransaction>> ListByUserAsync(long userId, CancellationToken ct) =>
        Task.FromResult(Transactions.Where(x => x.UserId == userId).OrderByDescending(x => x.Date).ToList());

    public Task<List<PersonalTransaction>> ListByUserAndDateRangeAsync(long userId, DateTime from, DateTime to, CancellationToken ct) =>
        Task.FromResult(Transactions
            .Where(t => t.UserId == userId && t.Date.Date >= from.Date && t.Date.Date <= to.Date)
            .OrderByDescending(t => t.Date)
            .ToList());

    public Task<List<PersonalTransaction>> ListRecentByUserAsync(long userId, int take, CancellationToken ct) =>
        Task.FromResult(Transactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.Date)
            .Take(take <= 0 ? 20 : take)
            .ToList());

    public Task<List<PersonalTransaction>> ListBankDerivedByUserAsync(long userId, CancellationToken ct) =>
        Task.FromResult(Transactions
            .Where(x => x.UserId == userId && x.SourceBankImportedTransactionId != null)
            .ToList());

    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

    public Task<List<PersonalTransaction>> ListBankDerivedAsync(CancellationToken ct) =>
        Task.FromResult(Transactions.Where(x => x.SourceBankImportedTransactionId != null).ToList());
}
