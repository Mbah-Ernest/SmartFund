using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;

namespace SmartFund.Application.Interfaces
{
    public interface IAuditService
    {
        Task<List<AuditEntry>> ListAsync(AuditCategory category, CancellationToken ct);

        Task RecordAsync(
            AuditCategory category,
            string action,
            string description,
            long? ledgerTransactionId,
            CancellationToken ct);

        Task<long> ReverseAsync(long auditEntryId, string pin, CancellationToken ct);
    }
}
