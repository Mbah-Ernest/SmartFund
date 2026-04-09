using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IBankStatementUploadRepository
    {
        Task<BankStatementUpload?> GetByIdAsync(long id, CancellationToken ct);
        Task AddAsync(BankStatementUpload upload, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
