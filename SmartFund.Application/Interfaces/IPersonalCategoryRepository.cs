using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalCategoryRepository
    {
        Task<PersonalCategory?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<PersonalCategory>> ListAsync(CancellationToken ct);
        Task AddAsync(PersonalCategory category, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
