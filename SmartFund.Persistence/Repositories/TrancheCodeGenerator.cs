using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class TrancheCodeGenerator : ITrancheCodeGenerator
    {
        private readonly SmartFundDbContext _db;
        public TrancheCodeGenerator(SmartFundDbContext db) => _db = db;

        public async Task<string> NextAsync(DateTime utcNow, CancellationToken ct)
        {
            var dateKey = utcNow.ToString("yyyyMMdd");

            await using var tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);

            var row = await _db.Set<TrancheDailySequence>().FirstOrDefaultAsync(x => x.DateKey == dateKey, ct);
            if (row is null)
            {
                row = new TrancheDailySequence { DateKey = dateKey, LastNumber = 0 };
                _db.Set<TrancheDailySequence>().Add(row);
            }

            row.LastNumber += 1;
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return $"TR-{dateKey}-{row.LastNumber:D4}";
        }
    }
}