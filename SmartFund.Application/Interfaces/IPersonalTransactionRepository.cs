using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalTransactionRepository
    {
        Task<PersonalTransaction?> GetByIdAsync(long id, CancellationToken ct);
        Task<List<PersonalTransaction>> ListByWalletIdAsync(long walletId, CancellationToken ct);
        Task<List<PersonalTransaction>> ListAllAsync(CancellationToken ct);
        Task AddAsync(PersonalTransaction tx, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);

        /// <summary>Lists transactions that were created by posting a bank import (have provenance).</summary>
        Task<List<PersonalTransaction>> ListBankDerivedAsync(CancellationToken ct);
    }
}
