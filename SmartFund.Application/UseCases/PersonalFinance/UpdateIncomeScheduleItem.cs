using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class UpdateIncomeScheduleItem
    {
        private readonly IIncomeScheduleRepository _repo;

        public UpdateIncomeScheduleItem(IIncomeScheduleRepository repo) => _repo = repo;

        public async Task<IncomeScheduleItem> ExecuteAsync(
            long userId,
            long id,
            string label,
            decimal amount,
            IncomeScheduleDirection direction,
            IncomeScheduleKind kind,
            IncomeRecurrenceInterval? recurrenceInterval,
            DateTime nextExpectedDate,
            DateTime? endDate,
            string? notes,
            CancellationToken ct)
        {
            var item = await _repo.GetByIdForUserAsync(id, userId, ct)
                ?? throw new DomainException("Income schedule item not found.");

            item.Update(label, amount, direction, kind, recurrenceInterval, nextExpectedDate, endDate, notes);
            await _repo.SaveChangesAsync(ct);
            return item;
        }
    }
}
