using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class BankStatementUploadRepository : IBankStatementUploadRepository
    {
        private readonly SmartFundDbContext _db;
        public BankStatementUploadRepository(SmartFundDbContext db) => _db = db;

        public Task<BankStatementUpload?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.BankStatementUploads.FirstOrDefaultAsync(upload => upload.Id == id, cancellationToken: ct);

        public Task AddAsync(BankStatementUpload upload, CancellationToken ct) =>
            _db.BankStatementUploads.AddAsync(upload, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) => _db.SaveChangesAsync(ct);
    }
}
