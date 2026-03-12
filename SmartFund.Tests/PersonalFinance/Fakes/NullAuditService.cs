using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;

namespace SmartFund.Tests.PersonalFinance.Fakes;

public sealed class NullAuditService : IAuditService
{
    public Task<List<AuditEntry>> ListAsync(AuditCategory category, CancellationToken ct) =>
        Task.FromResult(new List<AuditEntry>());

    public Task RecordAsync(AuditCategory category, string action, string description, long? ledgerTransactionId, CancellationToken ct) =>
        Task.CompletedTask;

    public Task<long> ReverseAsync(long auditEntryId, string pin, CancellationToken ct) =>
        Task.FromResult(0L);
}
