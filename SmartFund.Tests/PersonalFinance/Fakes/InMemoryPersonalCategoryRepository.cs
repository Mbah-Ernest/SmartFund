using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Tests.PersonalFinance.Fakes;

internal sealed class InMemoryPersonalCategoryRepository : IPersonalCategoryRepository
{
    private long _nextId = 1;

    public List<PersonalCategory> Categories { get; } = new();

    public Task<PersonalCategory?> GetByIdAsync(long id, CancellationToken ct) =>
        Task.FromResult(Categories.FirstOrDefault(x => x.Id == id));

    public Task<PersonalCategory?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) =>
        Task.FromResult(Categories.FirstOrDefault(x => x.Id == id && x.UserId == userId));

    public Task<List<PersonalCategory>> ListAsync(CancellationToken ct) =>
        Task.FromResult(Categories.ToList());

    public Task<List<PersonalCategory>> ListByUserAsync(long userId, CancellationToken ct) =>
        Task.FromResult(Categories.Where(x => x.UserId == userId).ToList());

    public Task AddAsync(PersonalCategory category, CancellationToken ct)
    {
        EntityId.Set(category, _nextId++);
        Categories.Add(category);
        return Task.CompletedTask;
    }

    public Task RemoveAsync(PersonalCategory category, CancellationToken ct)
    {
        Categories.Remove(category);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
}
