using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class DealRepository : IDealRepository
    {
        private readonly SmartFundDbContext _db;

        public DealRepository(SmartFundDbContext db) => _db = db;

        public Task AddAsync(Deal deal, CancellationToken ct) =>
            _db.Deals.AddAsync(deal, ct).AsTask();

        public Task<Deal?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.Deals.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<Deal>> ListAsync(CancellationToken ct) =>
            _db.Deals.OrderByDescending(x => x.CreatedAtUtc).ToListAsync(ct);

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
