using SmartFund.Domain.PersonalFinance.Entities;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalDebtRepository
    {
        Task<PersonalDebt?> GetByIdAsync(long id, CancellationToken ct);
        Task<PersonalDebt?> GetByIdForUserAsync(long id, long userId, CancellationToken ct);
        Task<List<PersonalDebt>> ListByUserAsync(long userId, CancellationToken ct);
        Task<List<PersonalDebt>> ListActiveByUserAsync(long userId, CancellationToken ct);
        Task AddAsync(PersonalDebt debt, CancellationToken ct);
        Task RemoveAsync(PersonalDebt debt, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
