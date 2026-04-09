using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class UserRepository : IUserRepository
    {
        private readonly SmartFundDbContext _db;

        public UserRepository(SmartFundDbContext db) => _db = db;

        public Task<User?> GetByIdAsync(long id, CancellationToken ct) =>
            _db.Users.FirstOrDefaultAsync(x => x.Id == id, ct);

        public Task<User?> GetByEmailAsync(string email, CancellationToken ct) =>
            _db.Users.FirstOrDefaultAsync(x => x.Email == email, ct);

        public Task<List<User>> ListAsync(CancellationToken ct) =>
            _db.Users.OrderBy(x => x.FullName).ToListAsync(ct);

        public Task AddAsync(User user, CancellationToken ct) =>
            _db.Users.AddAsync(user, ct).AsTask();

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
