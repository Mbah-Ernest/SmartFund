using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
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

    public Task AddAsync(PersonalTransaction tx, CancellationToken ct)
    {
        EntityId.Set(tx, _nextId++);
        Transactions.Add(tx);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
}
