using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class AgreementRepository : IAgreementRepository
    {
        private readonly SmartFundDbContext _db;

        public AgreementRepository(SmartFundDbContext db) => _db = db;

        public async Task<int?> GetLatestVersionAsync(long trancheId, CancellationToken ct)
        {
            return await _db.Agreements
                .Where(x => x.TrancheId == trancheId)
                .MaxAsync(x => (int?)x.Version, ct);
        }

        public Task AddAsync(Agreement agreement, CancellationToken ct) =>
            _db.Agreements.AddAsync(agreement, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
