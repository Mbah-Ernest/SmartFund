using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Tests.PersonalFinance.Fakes;

internal sealed class InMemoryLedgerAccountRepository : ILedgerAccountRepository
{
    private long _nextId = 1;

    public List<LedgerAccount> Accounts { get; } = new();

    public Task AddAsync(LedgerAccount account, CancellationToken ct)
    {
        EntityId.Set(account, _nextId++);
        Accounts.Add(account);
        return Task.CompletedTask;
    }

    public Task<LedgerAccount?> GetByIdAsync(long id, CancellationToken ct) =>
        Task.FromResult(Accounts.FirstOrDefault(x => x.Id == id));

    public Task<List<LedgerAccount>> ListAsync(CancellationToken ct) =>
        Task.FromResult(Accounts.ToList());

    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
}
