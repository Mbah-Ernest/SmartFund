using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class CreatePersonalDebt
    {
        private readonly IPersonalDebtRepository _debts;

        public CreatePersonalDebt(IPersonalDebtRepository debts)
        {
            _debts = debts;
        }

        public async Task<PersonalDebt> ExecuteAsync(
            long userId,
            string creditorName,
            decimal principalAmount,
            decimal totalAmountDue,
            DateTime dueDate,
            string? description,
            CancellationToken ct)
        {
            var debt = PersonalDebt.Create(userId, creditorName, principalAmount, totalAmountDue, dueDate, description);
            await _debts.AddAsync(debt, ct);
            await _debts.SaveChangesAsync(ct);
            return debt;
        }
    }
}
