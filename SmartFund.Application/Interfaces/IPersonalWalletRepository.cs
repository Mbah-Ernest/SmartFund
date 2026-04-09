using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalWalletRepository
    {
        Task<PersonalWallet?> GetByIdAsync(long id, CancellationToken ct);
        Task<PersonalWallet?> GetByIdForUserAsync(long id, long userId, CancellationToken ct);
        Task<List<PersonalWallet>> ListAsync(CancellationToken ct);
        Task<List<PersonalWallet>> ListByUserAsync(long userId, CancellationToken ct);
        Task AddAsync(PersonalWallet wallet, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
