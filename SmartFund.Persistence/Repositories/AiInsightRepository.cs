using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class AiInsightRepository : IAiInsightRepository
    {
        private readonly SmartFundDbContext _db;
        public AiInsightRepository(SmartFundDbContext db) => _db = db;

        public Task<AiInsight?> GetLatestForUserAsync(long userId, CancellationToken ct) =>
            _db.AiInsights
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.GeneratedAtUtc)
                .FirstOrDefaultAsync(ct);

        public async Task UpsertAsync(AiInsight insight, CancellationToken ct)
        {
            var existing = await _db.AiInsights
                .Where(x => x.UserId == insight.UserId)
                .OrderByDescending(x => x.GeneratedAtUtc)
                .FirstOrDefaultAsync(ct);

            if (existing is not null)
                _db.AiInsights.Remove(existing);

            await _db.AiInsights.AddAsync(insight, ct);
        }

        public Task SaveChangesAsync(CancellationToken ct) => _db.SaveChangesAsync(ct);
    }
}
