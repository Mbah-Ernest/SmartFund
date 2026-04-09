using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalCategoryRepository
    {
        Task<PersonalCategory?> GetByIdAsync(long id, CancellationToken ct);
        Task<PersonalCategory?> GetByIdForUserAsync(long id, long userId, CancellationToken ct);
        Task<List<PersonalCategory>> ListAsync(CancellationToken ct);
        Task<List<PersonalCategory>> ListByUserAsync(long userId, CancellationToken ct);
        Task AddAsync(PersonalCategory category, CancellationToken ct);
        Task RemoveAsync(PersonalCategory category, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
