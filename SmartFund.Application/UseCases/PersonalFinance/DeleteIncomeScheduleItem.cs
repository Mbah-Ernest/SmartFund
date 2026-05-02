using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class DeleteIncomeScheduleItem
    {
        private readonly IIncomeScheduleRepository _repo;

        public DeleteIncomeScheduleItem(IIncomeScheduleRepository repo) => _repo = repo;

        public async Task ExecuteAsync(long userId, long id, CancellationToken ct)
        {
            var item = await _repo.GetByIdForUserAsync(id, userId, ct)
                ?? throw new DomainException("Income schedule item not found.");

            await _repo.RemoveAsync(item, ct);
            await _repo.SaveChangesAsync(ct);
        }
    }
}
