using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class PersonalFinanceSettingsRepository : IPersonalFinanceSettingsRepository
    {
        private readonly SmartFundDbContext _db;

        public PersonalFinanceSettingsRepository(SmartFundDbContext db) => _db = db;

        public Task<PersonalFinanceSettings?> GetAsync(CancellationToken ct) =>
            _db.PersonalFinanceSettings.FirstOrDefaultAsync(ct);

        public Task AddAsync(PersonalFinanceSettings settings, CancellationToken ct) =>
            _db.PersonalFinanceSettings.AddAsync(settings, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
