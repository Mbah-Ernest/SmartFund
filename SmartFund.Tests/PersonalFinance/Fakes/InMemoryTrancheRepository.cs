using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Tests.PersonalFinance.Fakes;

internal sealed class InMemoryTrancheRepository : ITrancheRepository
{
    private long _nextId = 1;

    public List<Tranche> Tranches { get; } = new();

    public Task AddAsync(Tranche tranche, CancellationToken ct)
    {
        EntityId.Set(tranche, _nextId++);
        Tranches.Add(tranche);
        return Task.CompletedTask;
    }

    public Task<Tranche?> GetByIdAsync(long id, CancellationToken ct) =>
        Task.FromResult(Tranches.FirstOrDefault(x => x.Id == id));

    public Task<List<Tranche>> ListAsync(CancellationToken ct) =>
        Task.FromResult(Tranches.ToList());

    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;

    public Task<decimal> GetOutstandingPrincipalByDealIdAsync(long dealId, DateTime asOfUtcDate, CancellationToken ct) =>
        Task.FromResult(0m);
}
