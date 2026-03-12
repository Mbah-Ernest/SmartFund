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
    public sealed class AuditRepository : IAuditRepository
    {
        private readonly SmartFundDbContext _db;

        public AuditRepository(SmartFundDbContext db) => _db = db;

        public Task<AuditEntry?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.AuditEntries.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<AuditEntry>> ListByCategoryAsync(AuditCategory category, CancellationToken ct) =>
            _db.AuditEntries
                .Where(x => x.Category == category)
                .OrderByDescending(x => x.CreatedAtUtc)
                .ToListAsync(ct);

        public Task AddAsync(AuditEntry entry, CancellationToken ct) =>
            _db.AuditEntries.AddAsync(entry, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
