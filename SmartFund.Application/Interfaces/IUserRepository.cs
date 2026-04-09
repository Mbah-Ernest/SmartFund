using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(long id, CancellationToken ct);
        Task<User?> GetByEmailAsync(string email, CancellationToken ct);
        Task<List<User>> ListAsync(CancellationToken ct);
        Task AddAsync(User user, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
