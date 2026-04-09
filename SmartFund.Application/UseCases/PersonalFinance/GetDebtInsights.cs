using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class GetDebtInsights
    {
        private readonly IPersonalDebtRepository _debts;
        private readonly IPersonalTransactionRepository _transactions;

        public GetDebtInsights(IPersonalDebtRepository debts, IPersonalTransactionRepository transactions)
        {
            _debts = debts;
            _transactions = transactions;
        }

        public async Task<DebtInsightsResult> ExecuteAsync(long userId, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var windowStart = now.AddDays(-90);

            var debts = await _debts.ListByUserAsync(userId, ct);
            var transactions = await _transactions.ListByUserAndDateRangeAsync(userId, windowStart, now, ct);

            // Income / expense averages over 90 days (≈ 3 months)
            var totalIncome = transactions
                .Where(t => t.TransactionType == PersonalTransactionType.Income)
                .Sum(t => t.Amount);
            var totalExpenses = transactions
                .Where(t => t.TransactionType == PersonalTransactionType.Expense)
                .Sum(t => t.Amount);

            var avgMonthlyIncome = decimal.Round(totalIncome / 3m, 2);
            var avgMonthlyExpenses = decimal.Round(totalExpenses / 3m, 2);
            var avgMonthlySavings = decimal.Round(avgMonthlyIncome - avgMonthlyExpenses, 2);
            var savingsInsufficient = avgMonthlySavings <= 0m;

            // Summary across non-forgiven debts
            var activeDebts = debts.Where(d => d.Status != DebtStatus.Forgiven).ToList();
            var totalOwed = activeDebts.Sum(d => d.TotalAmountDue);
            var totalInterest = activeDebts.Sum(d => d.InterestAmount);
            var totalPaid = activeDebts.Sum(d => d.TotalPaid);
            var percentPaid = totalOwed > 0m ? decimal.Round((totalPaid / totalOwed) * 100m, 2) : 100m;

            // Monthly burden: payments made in the prior calendar month
            var firstOfThisMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var firstOfLastMonth = firstOfThisMonth.AddMonths(-1);
            var priorMonthPayments = debts
                .SelectMany(d => d.Payments)
                .Where(p => p.PaidOn >= firstOfLastMonth && p.PaidOn < firstOfThisMonth)
                .Sum(p => p.Amount);
            var burdenPercent = avgMonthlyIncome > 0m
                ? decimal.Round((priorMonthPayments / avgMonthlyIncome) * 100m, 2)
                : 0m;

            // Debt-free date projection
            var unpaidDebts = activeDebts.Where(d => d.Status == DebtStatus.Active).ToList();
            var totalRemaining = unpaidDebts.Sum(d => d.RemainingBalance);
            DateTime? debtFreeDate = null;
            if (!savingsInsufficient && totalRemaining > 0m)
            {
                var dailySavings = avgMonthlySavings / 30.44m;
                var daysToFree = (double)(totalRemaining / dailySavings);
                debtFreeDate = now.AddDays(daysToFree);
            }
            else if (totalRemaining == 0m)
            {
                debtFreeDate = now;
            }

            // Per-debt savings targets (proportional by remaining balance)
            var savingsTargets = new List<DebtSavingsTarget>();
            foreach (var debt in unpaidDebts)
            {
                decimal dailyTarget = 0m;
                decimal weeklyTarget = 0m;

                if (!savingsInsufficient && totalRemaining > 0m)
                {
                    var weight = debt.RemainingBalance / totalRemaining;
                    dailyTarget = decimal.Round((avgMonthlySavings * weight) / 30.44m, 2);
                    weeklyTarget = decimal.Round(dailyTarget * 7m, 2);
                }

                savingsTargets.Add(new DebtSavingsTarget(
                    debt.Id,
                    debt.CreditorName,
                    dailyTarget,
                    weeklyTarget));
            }

            // Coverage analysis per debt
            var coverageItems = unpaidDebts.Select(debt =>
            {
                var daysUntilDue = debt.DaysUntilDue;
                var projectedSavings = !savingsInsufficient && daysUntilDue > 0
                    ? decimal.Round(avgMonthlySavings * (daysUntilDue / 30.44m), 2)
                    : 0m;
                var canCover = projectedSavings >= debt.RemainingBalance;

                return new DebtCoverageItem(
                    debt.Id,
                    debt.CreditorName,
                    debt.RemainingBalance,
                    daysUntilDue,
                    projectedSavings,
                    canCover);
            }).ToList();

            // Urgency ranking (all active including overdue)
            var urgencyRanking = unpaidDebts
                .OrderBy(d => d.DaysUntilDue)
                .Select(debt =>
                {
                    var days = debt.DaysUntilDue;
                    var badge = days < 0 ? "Overdue"
                        : days <= 7 ? "Critical"
                        : days <= 30 ? "Soon"
                        : days <= 90 ? "Upcoming"
                        : "Future";

                    return new RankedDebt(
                        debt.Id,
                        debt.CreditorName,
                        debt.RemainingBalance,
                        days,
                        badge);
                }).ToList();

            return new DebtInsightsResult(
                totalOwed,
                totalInterest,
                totalPaid,
                percentPaid,
                avgMonthlyIncome,
                avgMonthlyExpenses,
                avgMonthlySavings,
                savingsInsufficient,
                priorMonthPayments,
                burdenPercent,
                debtFreeDate,
                savingsTargets,
                coverageItems,
                urgencyRanking);
        }
    }

    public record DebtInsightsResult(
        decimal TotalOwed,
        decimal TotalInterest,
        decimal TotalPaid,
        decimal PercentPaid,
        decimal AvgMonthlyIncome,
        decimal AvgMonthlyExpenses,
        decimal AvgMonthlySavings,
        bool SavingsInsufficient,
        decimal MonthlyDebtBurden,
        decimal BurdenPercent,
        DateTime? DebtFreeDate,
        IReadOnlyList<DebtSavingsTarget> SavingsTargets,
        IReadOnlyList<DebtCoverageItem> CoverageItems,
        IReadOnlyList<RankedDebt> UrgencyRanking);

    public record DebtSavingsTarget(
        long DebtId,
        string CreditorName,
        decimal DailySavingsTarget,
        decimal WeeklySavingsTarget);

    public record DebtCoverageItem(
        long DebtId,
        string CreditorName,
        decimal RemainingBalance,
        int DaysUntilDue,
        decimal ProjectedSavingsByDue,
        bool CanCover);

    public record RankedDebt(
        long DebtId,
        string CreditorName,
        decimal RemainingBalance,
        int DaysUntilDue,
        string UrgencyBadge);
}
