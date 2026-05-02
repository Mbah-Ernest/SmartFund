using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Persistence.DbContext;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Persistence.Repositories
{
    public sealed class IncomeScheduleRepository : IIncomeScheduleRepository
    {
        private readonly SmartFundDbContext _db;

        public IncomeScheduleRepository(SmartFundDbContext db) => _db = db;

        public Task<IncomeScheduleItem?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.Set<IncomeScheduleItem>().FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<IncomeScheduleItem?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) =>
            _db.Set<IncomeScheduleItem>().FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

        public Task<List<IncomeScheduleItem>> ListByUserAsync(long userId, CancellationToken ct) =>
            _db.Set<IncomeScheduleItem>()
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.NextExpectedDate)
                .ToListAsync(ct);

        public Task<List<IncomeScheduleItem>> ListActiveByUserAsync(long userId, CancellationToken ct) =>
            _db.Set<IncomeScheduleItem>()
                .Where(x => x.UserId == userId && x.Status == IncomeScheduleStatus.Active)
                .OrderBy(x => x.NextExpectedDate)
                .ToListAsync(ct);

        public Task AddAsync(IncomeScheduleItem item, CancellationToken ct) =>
            _db.Set<IncomeScheduleItem>().AddAsync(item, ct).AsTask();

        public Task RemoveAsync(IncomeScheduleItem item, CancellationToken ct)
        {
            _db.Set<IncomeScheduleItem>().Remove(item);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
