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
    public sealed class PersonalWalletRepository : IPersonalWalletRepository
    {
        private readonly SmartFundDbContext _db;

        public PersonalWalletRepository(SmartFundDbContext db) => _db = db;

        public Task AddAsync(PersonalWallet wallet, CancellationToken ct) =>
            _db.PersonalWallets.AddAsync(wallet, ct).AsTask();

        public Task<PersonalWallet?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.PersonalWallets.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<List<PersonalWallet>> ListAsync(CancellationToken ct) =>
            _db.PersonalWallets
                .OrderByDescending(x => x.Id)
                .ToListAsync(ct);

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
