using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class InsuranceWalletRepository : IInsuranceWalletRepository
    {
        private readonly SmartFundDbContext _db;

        public InsuranceWalletRepository(SmartFundDbContext db) => _db = db;

        public Task<InsuranceWallet?> GetGlobalAsync(CancellationToken ct) =>
            _db.InsuranceWallets.FirstOrDefaultAsync(x => x.Type == InsuranceWalletType.Global, ct);

        public Task<InsuranceWallet?> GetByDealIdAsync(long dealId, CancellationToken ct) =>
            _db.InsuranceWallets.FirstOrDefaultAsync(x => x.Type == InsuranceWalletType.Deal && x.DealId == dealId, ct);

        public Task AddAsync(InsuranceWallet wallet, CancellationToken ct) =>
            _db.InsuranceWallets.AddAsync(wallet, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
