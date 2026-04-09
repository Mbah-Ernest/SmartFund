using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IRecurringPatternRepository
    {
        Task<List<RecurringPattern>> ListByUserAsync(long userId, CancellationToken ct);
        Task<RecurringPattern?> FindByUserAndDescriptionAsync(long userId, string description, CancellationToken ct);
        Task AddAsync(RecurringPattern pattern, CancellationToken ct);
        Task DeleteAllForUserAsync(long userId, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
