using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class InvestorRepository : IInvestorRepository
    {
        private readonly SmartFundDbContext _db;

        public InvestorRepository(SmartFundDbContext db) => _db = db;

        public Task AddAsync(Investor investor, CancellationToken ct) =>
            _db.Investors.AddAsync(investor, ct).AsTask();

        public Task<Investor?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.Investors.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<Investor>> ListAsync(CancellationToken ct) =>
            _db.Investors.OrderByDescending(x => x.CreatedAtUtc).ToListAsync(ct);

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
