using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalFinanceSettingsRepository
    {
        Task<PersonalFinanceSettings?> GetAsync(CancellationToken ct);
        Task AddAsync(PersonalFinanceSettings settings, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
