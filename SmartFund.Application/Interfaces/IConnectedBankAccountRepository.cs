using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IConnectedBankAccountRepository
    {
        Task<List<ConnectedBankAccount>> ListAsync(CancellationToken ct);
        Task<ConnectedBankAccount?> GetByIdAsync(long id, CancellationToken ct);
        Task<ConnectedBankAccount?> GetByMonoAccountIdAsync(string monoAccountId, CancellationToken ct);
        Task<int> CountAsync(CancellationToken ct);
        Task AddAsync(ConnectedBankAccount account, CancellationToken ct);
        Task RemoveAsync(ConnectedBankAccount account, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
