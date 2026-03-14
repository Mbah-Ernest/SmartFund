using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IBankCategorizationRuleRepository
    {
        Task<BankCategorizationRule?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<BankCategorizationRule>> ListActiveAsync(CancellationToken ct);
        Task<List<BankCategorizationRule>> ListAllAsync(CancellationToken ct);
        Task AddAsync(BankCategorizationRule rule, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
