using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class PersonalCategoryRepository : IPersonalCategoryRepository
    {
        private readonly SmartFundDbContext _db;

        public PersonalCategoryRepository(SmartFundDbContext db) => _db = db;

        public Task AddAsync(PersonalCategory category, CancellationToken ct) =>
            _db.PersonalCategories.AddAsync(category, ct).AsTask();

        public Task RemoveAsync(PersonalCategory category, CancellationToken ct)
        {
            _db.PersonalCategories.Remove(category);
            return Task.CompletedTask;
        }

        public Task<PersonalCategory?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.PersonalCategories.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<PersonalCategory?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) =>
            _db.PersonalCategories.FirstOrDefaultAsync(x => x.Id == id && x.UserId == userId, ct);

        public Task<List<PersonalCategory>> ListAsync(CancellationToken ct) =>
            _db.PersonalCategories
                .OrderBy(x => x.Type)
                .ThenBy(x => x.Name)
                .ToListAsync(ct);

        public Task<List<PersonalCategory>> ListByUserAsync(long userId, CancellationToken ct) =>
            _db.PersonalCategories
                .Where(x => x.UserId == userId)
                .OrderBy(x => x.Type)
                .ThenBy(x => x.Name)
                .ToListAsync(ct);

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
