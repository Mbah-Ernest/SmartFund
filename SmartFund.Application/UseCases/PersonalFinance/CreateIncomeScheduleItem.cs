using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class CreateIncomeScheduleItem
    {
        private readonly IIncomeScheduleRepository _repo;

        public CreateIncomeScheduleItem(IIncomeScheduleRepository repo) => _repo = repo;

        public async Task<IncomeScheduleItem> ExecuteAsync(
            long userId,
            string label,
            decimal amount,
            IncomeScheduleDirection direction,
            IncomeScheduleKind kind,
            DateTime nextExpectedDate,
            IncomeRecurrenceInterval? recurrenceInterval,
            DateTime? endDate,
            string? notes,
            CancellationToken ct)
        {
            var item = IncomeScheduleItem.Create(userId, label, amount, direction, kind, nextExpectedDate, recurrenceInterval, endDate, notes);
            await _repo.AddAsync(item, ct);
            await _repo.SaveChangesAsync(ct);
            return item;
        }
    }
}
