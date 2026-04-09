using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class MarkDebtForgiven
    {
        private readonly IPersonalDebtRepository _debts;

        public MarkDebtForgiven(IPersonalDebtRepository debts)
        {
            _debts = debts;
        }

        public async Task<PersonalDebt> ExecuteAsync(long userId, long debtId, CancellationToken ct)
        {
            var debt = await _debts.GetByIdForUserAsync(debtId, userId, ct);
            if (debt is null)
                throw new DomainException("Debt not found.");

            debt.MarkForgiven();
            await _debts.SaveChangesAsync(ct);
            return debt;
        }
    }
}
