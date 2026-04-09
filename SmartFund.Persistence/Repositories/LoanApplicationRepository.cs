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
    public sealed class LoanApplicationRepository : ILoanApplicationRepository
    {
        private readonly SmartFundDbContext _db;

        public LoanApplicationRepository(SmartFundDbContext db) => _db = db;

        public Task<LoanApplication?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.LoanApplications.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<LoanApplication>> ListByUserAsync(long userId, CancellationToken ct) =>
            _db.LoanApplications
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.SubmittedAtUtc)
                .ToListAsync(ct);

        public Task<List<LoanApplication>> ListAllAsync(LoanApplicationStatus? statusFilter, CancellationToken ct) =>
            statusFilter.HasValue
                ? _db.LoanApplications
                    .Where(x => x.Status == statusFilter.Value)
                    .OrderByDescending(x => x.SubmittedAtUtc)
                    .ToListAsync(ct)
                : _db.LoanApplications
                    .OrderByDescending(x => x.SubmittedAtUtc)
                    .ToListAsync(ct);

        public Task AddAsync(LoanApplication application, CancellationToken ct) =>
            _db.LoanApplications.AddAsync(application, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
