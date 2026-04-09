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
    public sealed class PersonalDebtRepository : IPersonalDebtRepository
    {
        private readonly SmartFundDbContext _db;

        public PersonalDebtRepository(SmartFundDbContext db) => _db = db;

        public Task<PersonalDebt?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.Set<PersonalDebt>()
                .Include(x => x.Payments)
                .FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<PersonalDebt?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) =>
            _db.Set<PersonalDebt>()
                .Include(x => x.Payments)
                .FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

        public Task<List<PersonalDebt>> ListByUserAsync(long userId, CancellationToken ct) =>
            _db.Set<PersonalDebt>()
                .Include(x => x.Payments)
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.Id)
                .ToListAsync(ct);

        public Task<List<PersonalDebt>> ListActiveByUserAsync(long userId, CancellationToken ct) =>
            _db.Set<PersonalDebt>()
                .Include(x => x.Payments)
                .Where(x => x.UserId == userId && x.Status == DebtStatus.Active)
                .OrderByDescending(x => x.Id)
                .ToListAsync(ct);

        public Task AddAsync(PersonalDebt debt, CancellationToken ct) =>
            _db.Set<PersonalDebt>().AddAsync(debt, ct).AsTask();

        public Task RemoveAsync(PersonalDebt debt, CancellationToken ct)
        {
            _db.Set<PersonalDebt>().Remove(debt);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
