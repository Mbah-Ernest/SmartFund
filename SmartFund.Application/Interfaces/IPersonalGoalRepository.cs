using SmartFund.Domain.PersonalFinance.Entities;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalGoalRepository
    {
        Task<PersonalGoal?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<PersonalGoal>> ListAsync(CancellationToken ct);
        Task AddAsync(PersonalGoal goal, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
