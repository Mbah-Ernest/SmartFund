using System.Threading;
using System.Threading.Tasks;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalInvestmentContributionRepository
    {
        Task AddAsync(PersonalInvestmentContribution contribution, CancellationToken ct);
        Task SaveChangesAsync(CancellationToken ct);
    }
}
