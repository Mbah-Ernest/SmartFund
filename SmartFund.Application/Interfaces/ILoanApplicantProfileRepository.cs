using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;

namespace SmartFund.Application.Interfaces
{
    public interface ILoanApplicantProfileRepository
    {
        Task<LoanApplicantProfile?> GetByIdAsync(long id, CancellationToken ct);
        Task<LoanApplicantProfile?> GetByUserIdAsync(long userId, CancellationToken ct);
        Task<List<LoanApplicantProfile>> ListAllAsync(LoanApplicantStatus? statusFilter, CancellationToken ct);
        Task AddAsync(LoanApplicantProfile profile, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
