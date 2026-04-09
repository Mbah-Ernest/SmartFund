using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;

namespace SmartFund.Application.Interfaces
{
    public interface ILoanApplicationRepository
    {
        Task<LoanApplication?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<LoanApplication>> ListByUserAsync(long userId, CancellationToken ct);
        Task<List<LoanApplication>> ListAllAsync(LoanApplicationStatus? statusFilter, CancellationToken ct);
        Task AddAsync(LoanApplication application, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
