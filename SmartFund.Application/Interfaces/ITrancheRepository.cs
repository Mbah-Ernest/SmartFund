using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;
using SmartFund.Domain.Entities;
using System;

namespace SmartFund.Application.Interfaces
{
    public interface ITrancheRepository
    {
        Task AddAsync(Tranche tranche, CancellationToken ct);
        Task<Tranche?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<Tranche>> ListAsync(CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);

        Task<decimal> GetOutstandingPrincipalByDealIdAsync(long dealId, DateTime asOfUtcDate, CancellationToken ct);

    }
}