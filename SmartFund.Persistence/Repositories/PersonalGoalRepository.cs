using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Persistence.DbContext;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Persistence.Repositories
{
    public sealed class PersonalGoalRepository : IPersonalGoalRepository
    {
        private readonly SmartFundDbContext _db;

        public PersonalGoalRepository(SmartFundDbContext db) => _db = db;

        public Task<PersonalGoal?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.Set<PersonalGoal>().FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<PersonalGoal>> ListAsync(CancellationToken ct) =>
            _db.Set<PersonalGoal>()
                .OrderByDescending(x => x.Id)
                .ToListAsync(ct);

        public Task AddAsync(PersonalGoal goal, CancellationToken ct) =>
            _db.Set<PersonalGoal>().AddAsync(goal, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
