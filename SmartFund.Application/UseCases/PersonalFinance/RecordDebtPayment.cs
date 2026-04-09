using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class RecordDebtPayment
    {
        private readonly IPersonalDebtRepository _debts;

        public RecordDebtPayment(IPersonalDebtRepository debts)
        {
            _debts = debts;
        }

        public async Task<(PersonalDebt Debt, PersonalDebtPayment Payment)> ExecuteAsync(
            long userId,
            long debtId,
            decimal amount,
            DateTime paidOn,
            string? note,
            CancellationToken ct)
        {
            var debt = await _debts.GetByIdForUserAsync(debtId, userId, ct);
            if (debt is null)
                throw new DomainException("Debt not found.");

            var payment = debt.RecordPayment(amount, paidOn, note);
            await _debts.SaveChangesAsync(ct);
            return (debt, payment);
        }
    }
}
