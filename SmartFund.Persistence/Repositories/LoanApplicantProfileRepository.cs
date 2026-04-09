using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class LoanApplicantProfileRepository : ILoanApplicantProfileRepository
    {
        private readonly SmartFundDbContext _db;

        public LoanApplicantProfileRepository(SmartFundDbContext db) => _db = db;

        public Task<LoanApplicantProfile?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.Set<LoanApplicantProfile>().FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<LoanApplicantProfile?> GetByUserIdAsync(long userId, CancellationToken ct) =>
            _db.Set<LoanApplicantProfile>().FirstOrDefaultAsync(x => x.UserId == userId, ct);

        public Task<List<LoanApplicantProfile>> ListAllAsync(LoanApplicantStatus? statusFilter, CancellationToken ct) =>
            statusFilter.HasValue
                ? _db.Set<LoanApplicantProfile>()
                    .Where(x => x.Status == statusFilter.Value)
                    .OrderByDescending(x => x.SubmittedAtUtc)
                    .ToListAsync(ct)
                : _db.Set<LoanApplicantProfile>()
                    .OrderByDescending(x => x.SubmittedAtUtc)
                    .ToListAsync(ct);

        public Task AddAsync(LoanApplicantProfile profile, CancellationToken ct) =>
            _db.Set<LoanApplicantProfile>().AddAsync(profile, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
