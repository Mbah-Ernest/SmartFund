using SmartFund.Domain.PersonalFinance.Entities;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalGoalRepository
    {
        Task<PersonalGoal?> GetByIdAsync(long id, CancellationToken ct);
        Task<PersonalGoal?> GetByIdForUserAsync(long id, long userId, CancellationToken ct);
        Task<List<PersonalGoal>> ListAsync(CancellationToken ct);
        Task<List<PersonalGoal>> ListByUserAsync(long userId, CancellationToken ct);
        Task AddAsync(PersonalGoal goal, CancellationToken ct);
        Task RemoveAsync(PersonalGoal goal, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
