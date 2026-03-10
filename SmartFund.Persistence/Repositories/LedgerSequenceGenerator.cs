using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class LedgerSequenceGenerator : ILedgerSequenceGenerator
    {
        private readonly SmartFundDbContext _db;

        public LedgerSequenceGenerator(SmartFundDbContext db) => _db = db;

        public async Task<string> NextAsync(DateTime utcNow, CancellationToken ct)
        {
            var dateKey = utcNow.ToString("yyyyMMdd");

            // SERIALIZABLE makes this safe under concurrency
            await using var tx = await _db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);

            var row = await _db.LedgerDailySequences
                .FirstOrDefaultAsync(x => x.DateKey == dateKey, ct);

            if (row is null)
            {
                row = new LedgerDailySequence { DateKey = dateKey, LastNumber = 0 };
                _db.LedgerDailySequences.Add(row);
            }

            row.LastNumber += 1;

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return $"SF-{dateKey}-{row.LastNumber:D6}";
        }
    }
}