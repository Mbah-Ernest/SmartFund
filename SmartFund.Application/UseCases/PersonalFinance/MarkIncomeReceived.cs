using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class MarkIncomeReceived
    {
        private readonly IIncomeScheduleRepository _repo;

        public MarkIncomeReceived(IIncomeScheduleRepository repo) => _repo = repo;

        public async Task<IncomeScheduleItem> ExecuteAsync(long userId, long id, CancellationToken ct)
        {
            var item = await _repo.GetByIdForUserAsync(id, userId, ct)
                ?? throw new DomainException("Income schedule item not found.");

            item.MarkReceived();
            await _repo.SaveChangesAsync(ct);
            return item;
        }
    }
}
