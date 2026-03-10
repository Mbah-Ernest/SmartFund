using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Persistence.DbContext;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System;

namespace SmartFund.Persistence.Repositories
{
    public sealed class TrancheRepository : ITrancheRepository
    {
        private readonly SmartFundDbContext _db;

        public TrancheRepository(SmartFundDbContext db) => _db = db;

        public Task AddAsync(Tranche tranche, CancellationToken ct) =>
            _db.Tranches.AddAsync(tranche, ct).AsTask();

        public Task<Tranche?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.Tranches.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<Tranche>> ListAsync(CancellationToken ct) =>
            _db.Tranches
                .OrderByDescending(x => x.Id)
                .ToListAsync(ct);

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);

        public async Task<decimal> GetOutstandingPrincipalByDealIdAsync(
            long dealId,
            DateTime asOfUtcDate,
            CancellationToken ct)
        {
            var asOf = asOfUtcDate.Date;

            var sum = await _db.Tranches
                .Where(t => t.DealId == dealId && t.MaturityDate >= asOf)
                .SumAsync(t => (decimal?)t.Principal, ct);

            return sum ?? 0m;
        }
    }
}