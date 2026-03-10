using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Tests.PersonalFinance.Fakes;

internal sealed class InMemoryPersonalWalletRepository : IPersonalWalletRepository
{
    private long _nextId = 1;

    public List<PersonalWallet> Wallets { get; } = new();

    public Task<PersonalWallet?> GetByIdAsync(long id, CancellationToken ct) =>
        Task.FromResult(Wallets.FirstOrDefault(x => x.Id == id));

    public Task<List<PersonalWallet>> ListAsync(CancellationToken ct) =>
        Task.FromResult(Wallets.OrderByDescending(x => x.Id).ToList());

    public Task AddAsync(PersonalWallet wallet, CancellationToken ct)
    {
        EntityId.Set(wallet, _nextId++);
        Wallets.Add(wallet);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
}
