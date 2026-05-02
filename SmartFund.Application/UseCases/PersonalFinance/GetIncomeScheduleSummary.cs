using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Enums;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public record IncomeScheduleSummary(
        int TotalActiveItems,
        decimal ExpectedIncomeThisMonthNaira,
        decimal ExpectedExpenseThisMonthNaira,
        decimal ProjectedNetThisMonthNaira,
        decimal ExpectedIncomeNext30DaysNaira,
        decimal ExpectedExpenseNext30DaysNaira,
        decimal ProjectedNetNext30DaysNaira,
        decimal ExpectedIncomeNext90DaysNaira,
        decimal ExpectedExpenseNext90DaysNaira,
        decimal ProjectedNetNext90DaysNaira,
        decimal RecurringIncomeTotalNaira,
        decimal RecurringExpenseTotalNaira,
        decimal OneTimeIncomeTotalNaira,
        decimal OneTimeExpenseTotalNaira,
        decimal ExpectedThisMonthNaira,
        decimal ExpectedNext30DaysNaira,
        decimal ExpectedNext90DaysNaira,
        decimal RecurringTotalNaira,
        decimal OneTimeTotalNaira);

    public sealed class GetIncomeScheduleSummary
    {
        private readonly IIncomeScheduleRepository _repo;

        public GetIncomeScheduleSummary(IIncomeScheduleRepository repo) => _repo = repo;

        public async Task<IncomeScheduleSummary> ExecuteAsync(long userId, CancellationToken ct)
        {
            var items = await _repo.ListActiveByUserAsync(userId, ct);

            var now = DateTime.UtcNow.Date;
            var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var monthEnd = monthStart.AddMonths(1);
            var next30End = now.AddDays(30);
            var next90End = now.AddDays(90);

            var monthlyIncome = items
                .Where(i => i.Direction == IncomeScheduleDirection.Inflow)
                .Sum(i => SumExpectedInWindow(i, monthStart, monthEnd));
            var monthlyExpense = items
                .Where(i => i.Direction == IncomeScheduleDirection.Outflow)
                .Sum(i => SumExpectedInWindow(i, monthStart, monthEnd));

            var next30Income = items
                .Where(i => i.Direction == IncomeScheduleDirection.Inflow)
                .Sum(i => SumExpectedInWindow(i, now, next30End));
            var next30Expense = items
                .Where(i => i.Direction == IncomeScheduleDirection.Outflow)
                .Sum(i => SumExpectedInWindow(i, now, next30End));

            var next90Income = items
                .Where(i => i.Direction == IncomeScheduleDirection.Inflow)
                .Sum(i => SumExpectedInWindow(i, now, next90End));
            var next90Expense = items
                .Where(i => i.Direction == IncomeScheduleDirection.Outflow)
                .Sum(i => SumExpectedInWindow(i, now, next90End));

            var recurringIncome = items
                .Where(i => i.Kind == IncomeScheduleKind.Recurring && i.Direction == IncomeScheduleDirection.Inflow)
                .Sum(i => i.Amount);
            var recurringExpense = items
                .Where(i => i.Kind == IncomeScheduleKind.Recurring && i.Direction == IncomeScheduleDirection.Outflow)
                .Sum(i => i.Amount);

            var oneTimeIncome = items
                .Where(i => i.Kind == IncomeScheduleKind.OneTime && i.Direction == IncomeScheduleDirection.Inflow)
                .Sum(i => i.Amount);
            var oneTimeExpense = items
                .Where(i => i.Kind == IncomeScheduleKind.OneTime && i.Direction == IncomeScheduleDirection.Outflow)
                .Sum(i => i.Amount);

            return new IncomeScheduleSummary(
                TotalActiveItems: items.Count,
                ExpectedIncomeThisMonthNaira: monthlyIncome,
                ExpectedExpenseThisMonthNaira: monthlyExpense,
                ProjectedNetThisMonthNaira: monthlyIncome - monthlyExpense,
                ExpectedIncomeNext30DaysNaira: next30Income,
                ExpectedExpenseNext30DaysNaira: next30Expense,
                ProjectedNetNext30DaysNaira: next30Income - next30Expense,
                ExpectedIncomeNext90DaysNaira: next90Income,
                ExpectedExpenseNext90DaysNaira: next90Expense,
                ProjectedNetNext90DaysNaira: next90Income - next90Expense,
                RecurringIncomeTotalNaira: recurringIncome,
                RecurringExpenseTotalNaira: recurringExpense,
                OneTimeIncomeTotalNaira: oneTimeIncome,
                OneTimeExpenseTotalNaira: oneTimeExpense,
                ExpectedThisMonthNaira: monthlyIncome,
                ExpectedNext30DaysNaira: next30Income,
                ExpectedNext90DaysNaira: next90Income,
                RecurringTotalNaira: recurringIncome,
                OneTimeTotalNaira: oneTimeIncome);
        }

        private static decimal SumExpectedInWindow(Domain.PersonalFinance.Entities.IncomeScheduleItem item, DateTime startInclusive, DateTime endExclusive)
        {
            if (item.Kind == IncomeScheduleKind.OneTime)
            {
                return item.NextExpectedDate >= startInclusive && item.NextExpectedDate < endExclusive
                    ? item.Amount
                    : 0m;
            }

            if (!item.RecurrenceInterval.HasValue)
                return 0m;

            var cursor = item.NextExpectedDate.Date;
            var endDate = item.EndDate?.Date;
            if (endDate.HasValue && cursor > endDate.Value)
                return 0m;

            while (cursor < startInclusive)
            {
                cursor = Advance(cursor, item.RecurrenceInterval.Value);
                if (endDate.HasValue && cursor > endDate.Value)
                    return 0m;
            }

            var total = 0m;
            while (cursor < endExclusive)
            {
                if (endDate.HasValue && cursor > endDate.Value)
                    break;

                total += item.Amount;
                cursor = Advance(cursor, item.RecurrenceInterval.Value);
            }

            return total;
        }

        private static DateTime Advance(DateTime date, IncomeRecurrenceInterval interval) => interval switch
        {
            IncomeRecurrenceInterval.Daily => date.AddDays(1),
            IncomeRecurrenceInterval.Weekly => date.AddDays(7),
            IncomeRecurrenceInterval.BiWeekly => date.AddDays(14),
            IncomeRecurrenceInterval.Monthly => date.AddMonths(1),
            IncomeRecurrenceInterval.Quarterly => date.AddMonths(3),
            IncomeRecurrenceInterval.Annually => date.AddYears(1),
            _ => date.AddMonths(1)
        };
    }
}
