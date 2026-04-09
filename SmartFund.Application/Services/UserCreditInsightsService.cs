using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalBudget.Enums;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Application.Services
{
    public sealed class UserCreditInsightsService : IUserCreditInsightsService
    {
        private readonly IUserRepository _userRepo;
        private readonly IPersonalTransactionRepository _txRepo;
        private readonly IPersonalBudgetRepository _budgetRepo;
        private readonly IPersonalBudgetTrackingRepository _trackingRepo;
        private readonly IPersonalGoalRepository _goalRepo;
        private readonly IConnectedBankAccountRepository _bankAccountRepo;
        private readonly ILoanApplicationRepository _loanRepo;

        public UserCreditInsightsService(
            IUserRepository userRepo,
            IPersonalTransactionRepository txRepo,
            IPersonalBudgetRepository budgetRepo,
            IPersonalBudgetTrackingRepository trackingRepo,
            IPersonalGoalRepository goalRepo,
            IConnectedBankAccountRepository bankAccountRepo,
            ILoanApplicationRepository loanRepo)
        {
            _userRepo = userRepo;
            _txRepo = txRepo;
            _budgetRepo = budgetRepo;
            _trackingRepo = trackingRepo;
            _goalRepo = goalRepo;
            _bankAccountRepo = bankAccountRepo;
            _loanRepo = loanRepo;
        }

        public async Task<UserCreditInsights> GetInsightsAsync(long userId, CancellationToken ct)
        {
            var user = await _userRepo.GetByIdAsync(userId, ct)
                ?? throw new DomainException("User not found.");

            var utcNow = DateTime.UtcNow;
            var tenureDays = (int)(utcNow - user.CreatedAtUtc).TotalDays;

            // 3-month window for trends
            var threeMonthsAgo = utcNow.AddMonths(-3);
            var transactions = await _txRepo.ListByUserAndDateRangeAsync(userId, threeMonthsAgo, utcNow, ct);

            var incomeByMonth = GroupByMonth(transactions, PersonalTransactionType.Income);
            var expenseByMonth = GroupByMonth(transactions, PersonalTransactionType.Expense);

            var months = GetLastNMonths(utcNow, 3);

            var monthlyIncomes = months.Select(m => incomeByMonth.TryGetValue(m, out var v) ? v : 0m).ToList();
            var monthlyExpenses = months.Select(m => expenseByMonth.TryGetValue(m, out var v) ? v : 0m).ToList();

            var avgIncome = monthlyIncomes.Average();
            var avgExpenses = monthlyExpenses.Average();
            var incomeToExpenseRatio = avgExpenses > 0 ? Math.Round(avgIncome / avgExpenses, 2) : 0m;

            // Income stability: 1 / (1 + CV) where CV = stddev/mean
            var incomeStability = ComputeStabilityScore(monthlyIncomes);

            // Avg monthly transaction count
            var txCountByMonth = months.Select(m =>
                (decimal)transactions.Count(t => t.Date.Year == m.Year && t.Date.Month == m.Month)).ToList();
            var avgTxCount = txCountByMonth.Average();

            // Connected bank accounts
            var bankAccounts = await _bankAccountRepo.ListByUserAsync(userId, ct);
            var bankAccountCount = bankAccounts.Count;

            // Budget compliance: % of (budget, month) pairs within budget, last 3 months
            var budgets = await _budgetRepo.ListByUserAsync(userId, ct);
            var budgetComplianceRate = await ComputeBudgetComplianceAsync(budgets, months, ct);

            // Goals on-track rate
            var goals = await _goalRepo.ListByUserAsync(userId, ct);
            var goalOnTrackRate = ComputeGoalOnTrackRate(goals, utcNow);

            // Loan history
            var loans = await _loanRepo.ListByUserAsync(userId, ct);
            var mostRecentLoanStatus = loans.Count > 0 ? loans[0].Status.ToString() : null;

            return new UserCreditInsights(
                userId,
                user.FullName,
                user.Email,
                tenureDays,
                Math.Round(avgIncome, 2),
                Math.Round(avgExpenses, 2),
                incomeToExpenseRatio,
                bankAccountCount,
                budgetComplianceRate,
                goalOnTrackRate,
                incomeStability,
                Math.Round(avgTxCount, 1),
                loans.Count,
                mostRecentLoanStatus);
        }

        // ── helpers ──────────────────────────────────────────────────────────

        private static Dictionary<(int Year, int Month), decimal> GroupByMonth(
            IEnumerable<SmartFund.Domain.PersonalFinance.Entities.PersonalTransaction> txs,
            PersonalTransactionType type)
        {
            return txs
                .Where(t => t.TransactionType == type)
                .GroupBy(t => (t.Date.Year, t.Date.Month))
                .ToDictionary(g => g.Key, g => g.Sum(t => t.Amount));
        }

        private static List<(int Year, int Month)> GetLastNMonths(DateTime utcNow, int n)
        {
            var result = new List<(int, int)>();
            for (int i = n - 1; i >= 0; i--)
            {
                var d = utcNow.AddMonths(-i);
                result.Add((d.Year, d.Month));
            }
            return result;
        }

        private static decimal ComputeStabilityScore(List<decimal> values)
        {
            if (values.Count == 0) return 0m;
            var mean = values.Average();
            if (mean == 0) return 1m;
            var variance = values.Select(v => (v - mean) * (v - mean)).Average();
            var stdDev = (decimal)Math.Sqrt((double)variance);
            var cv = stdDev / mean;
            return Math.Round(1m / (1m + cv), 2);
        }

        private async Task<decimal> ComputeBudgetComplianceAsync(
            IReadOnlyList<SmartFund.Domain.PersonalBudget.Entities.Budget> budgets,
            IReadOnlyList<(int Year, int Month)> months,
            CancellationToken ct)
        {
            if (budgets.Count == 0) return 1m;

            int compliant = 0, total = 0;
            foreach (var budget in budgets)
            {
                foreach (var (year, month) in months)
                {
                    var tracking = await _trackingRepo.GetAsync(budget.Id, year, month, ct);
                    if (tracking is null) continue;
                    total++;
                    if (!tracking.IsOverBudget()) compliant++;
                }
            }

            return total == 0 ? 1m : Math.Round((decimal)compliant / total, 2);
        }

        private static decimal ComputeGoalOnTrackRate(
            IReadOnlyList<SmartFund.Domain.PersonalFinance.Entities.PersonalGoal> goals,
            DateTime utcNow)
        {
            if (goals.Count == 0) return 1m;

            int onTrack = 0;
            foreach (var goal in goals)
            {
                if (goal.TargetAmount <= 0) continue;

                var totalDuration = (goal.Deadline - goal.CreatedAt).TotalDays;
                var elapsed = (utcNow - goal.CreatedAt).TotalDays;

                if (totalDuration <= 0) continue;

                var expectedProgress = (decimal)(elapsed / totalDuration);
                var actualProgress = goal.SavedAmount / goal.TargetAmount;

                if (actualProgress >= expectedProgress)
                    onTrack++;
            }

            return Math.Round((decimal)onTrack / goals.Count, 2);
        }
    }
}
