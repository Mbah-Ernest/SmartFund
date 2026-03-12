using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;

namespace SmartFund.Application.Interfaces
{
    public interface IAuditRepository
    {
        Task<AuditEntry?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<AuditEntry>> ListByCategoryAsync(AuditCategory category, CancellationToken ct);
        Task AddAsync(AuditEntry entry, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
