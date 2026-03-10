using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class PersonalInvestmentContributionRepository : IPersonalInvestmentContributionRepository
    {
        private readonly SmartFundDbContext _db;

        public PersonalInvestmentContributionRepository(SmartFundDbContext db) => _db = db;

        public Task AddAsync(PersonalInvestmentContribution contribution, CancellationToken ct) =>
            _db.AddAsync(contribution, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
