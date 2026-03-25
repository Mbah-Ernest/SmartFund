using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Reporting.PersonalFinance;
using SmartFund.Domain.PersonalBudget.Enums;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Application.Services.Agent
{
    // ──────────────────────────────────────────────────────────────
    // Return types — simple records so AgentChatService can serialize
    // ──────────────────────────────────────────────────────────────

    public sealed record WalletBalanceResult(
        long WalletId, string Name, string Currency,
        decimal BalanceNaira, bool IsConnectedBank, string? BankName);

    public sealed record SpendingSummaryResult(
        string CategoryName, string Type, decimal TotalNaira, int TransactionCount);

    public sealed record CashFlowResult(
        int Year, int Month, decimal IncomeNaira, decimal ExpensesNaira, decimal NetNaira);

    public sealed record GoalProgressResult(
        long GoalId, string Name, decimal TargetNaira, decimal SavedNaira,
        decimal ProgressPct, DateTime Deadline, int MonthsRemaining);

    public sealed record BudgetHealthResult(
        long BudgetId, string CategoryName, decimal BudgetedNaira,
        decimal SpentNaira, decimal RemainingNaira, bool IsOverBudget, string Period);

    public sealed record RecentTransactionResult(
        long Id, DateTime Date, decimal AmountNaira, string Type,
        string? CategoryName, string WalletName, string? Description, string? SourceBank);

    public sealed record CashRunwayResult(
        decimal TotalBalanceNaira,
        decimal AvgMonthlyBurnNaira,
        /// <summary>Null when there is no historical spend data yet.</summary>
        decimal? RunwayMonths,
        decimal LastMonthBurnNaira,
        /// <summary>Fractional change of last month vs 3-month avg. Positive = rising burn.</summary>
        decimal BurnTrend,
        DateTime CalculatedAt);

    public sealed record BudgetSuggestionResult(
        long CategoryId, string CategoryName,
        decimal AvgSpendNaira, decimal SuggestedBudgetNaira, string Rationale);

    public sealed record SpendingCutResult(
        string CategoryName, decimal CurrentSpendNaira, decimal SuggestedReductionNaira,
        decimal SuggestedNewSpendNaira, decimal ReductionPct);

    // ──────────────────────────────────────────────────────────────
    // Service
    // ──────────────────────────────────────────────────────────────

    public sealed class AgentQueryService
    {
        private readonly IPersonalWalletService _wallets;
        private readonly IPersonalTransactionRepository _txRepo;
        private readonly IPersonalCategoryRepository _categoryRepo;
        private readonly IPersonalGoalRepository _goalRepo;
        private readonly IPersonalBudgetRepository _budgetRepo;
        private readonly IPersonalBudgetTrackingRepository _trackingRepo;
        private readonly IConnectedBankAccountRepository _bankAccountRepo;
        private readonly IPersonalFinanceReportService _reports;
        private readonly IPersonalFinanceDashboardService _dashboard;

        public AgentQueryService(
            IPersonalWalletService wallets,
            IPersonalTransactionRepository txRepo,
            IPersonalCategoryRepository categoryRepo,
            IPersonalGoalRepository goalRepo,
            IPersonalBudgetRepository budgetRepo,
            IPersonalBudgetTrackingRepository trackingRepo,
            IConnectedBankAccountRepository bankAccountRepo,
            IPersonalFinanceReportService reports,
            IPersonalFinanceDashboardService dashboard)
        {
            _wallets = wallets;
            _txRepo = txRepo;
            _categoryRepo = categoryRepo;
            _goalRepo = goalRepo;
            _budgetRepo = budgetRepo;
            _trackingRepo = trackingRepo;
            _bankAccountRepo = bankAccountRepo;
            _reports = reports;
            _dashboard = dashboard;
        }

        // ── Tier 1: Read Tools ────────────────────────────────────

        public async Task<List<WalletBalanceResult>> GetWalletBalancesAsync(CancellationToken ct)
        {
            var wallets = await _wallets.GetAllWalletsAsync(ct);
            var bankAccounts = await _bankAccountRepo.ListAsync(ct);
            var bankByWallet = bankAccounts
                .Where(a => a.PersonalWalletId.HasValue)
                .ToDictionary(a => a.PersonalWalletId!.Value, a => a);

            var results = new List<WalletBalanceResult>();
            foreach (var w in wallets)
            {
                var balance = await _wallets.GetWalletBalanceAsync(w.Id, ct);
                var isBank = bankByWallet.TryGetValue(w.Id, out var bank);
                results.Add(new WalletBalanceResult(
                    w.Id, w.Name, w.Currency, balance,
                    isBank, isBank ? bank!.BankName : null));
            }
            return results;
        }

        public async Task<List<SpendingSummaryResult>> GetSpendingSummaryAsync(
            DateTime fromDate, DateTime toDate, long[]? categoryIds, CancellationToken ct)
        {
            var allTx = await _txRepo.ListByDateRangeAsync(fromDate, toDate, ct);
            var categories = await _categoryRepo.ListAsync(ct);
            var catMap = categories.ToDictionary(c => c.Id);

            var filtered = allTx.Where(t =>
                (t.TransactionType == PersonalTransactionType.Income ||
                 t.TransactionType == PersonalTransactionType.Expense) &&
                t.CategoryId.HasValue &&
                (categoryIds == null || categoryIds.Length == 0 || categoryIds.Contains(t.CategoryId.Value)));

            return filtered
                .GroupBy(t => t.CategoryId!.Value)
                .Select(g =>
                {
                    catMap.TryGetValue(g.Key, out var cat);
                    var typeName = cat?.Type == PersonalCategoryType.Income ? "Income" : "Expense";
                    return new SpendingSummaryResult(
                        cat?.Name ?? $"Category #{g.Key}",
                        typeName,
                        g.Sum(t => t.Amount),
                        g.Count());
                })
                .OrderByDescending(r => r.TotalNaira)
                .ToList();
        }

        public async Task<List<CashFlowResult>> GetCashFlowAsync(int months, CancellationToken ct)
        {
            var rows = await _reports.CashFlowReportAsync(ct);
            var cutoff = DateTime.UtcNow.AddMonths(-months);

            return rows
                .Where(r => new DateTime(r.Year, r.Month, 1) >= new DateTime(cutoff.Year, cutoff.Month, 1))
                .GroupBy(r => new { r.Year, r.Month })
                .Select(g => new CashFlowResult(
                    g.Key.Year,
                    g.Key.Month,
                    g.Sum(r => r.Inflow),
                    g.Sum(r => r.Outflow),
                    g.Sum(r => r.Inflow) - g.Sum(r => r.Outflow)))
                .OrderBy(r => r.Year).ThenBy(r => r.Month)
                .ToList();
        }

        public async Task<List<GoalProgressResult>> GetGoalProgressAsync(long? goalId, CancellationToken ct)
        {
            var goals = goalId.HasValue
                ? new List<SmartFund.Domain.PersonalFinance.Entities.PersonalGoal?> { await _goalRepo.GetByIdAsync(goalId.Value, ct) }
                    .Where(g => g is not null).Cast<SmartFund.Domain.PersonalFinance.Entities.PersonalGoal>().ToList()
                : await _goalRepo.ListAsync(ct);

            var utcNow = DateTime.UtcNow;
            return goals.Select(g =>
            {
                var pct = g.TargetAmount > 0 ? Math.Round(g.SavedAmount / g.TargetAmount * 100, 1) : 0m;
                var monthsLeft = g.Deadline > utcNow
                    ? (int)Math.Ceiling((g.Deadline - utcNow).TotalDays / 30.44)
                    : 0;
                return new GoalProgressResult(
                    g.Id, g.Name, g.TargetAmount, g.SavedAmount, pct, g.Deadline, monthsLeft);
            }).ToList();
        }

        public async Task<List<BudgetHealthResult>> GetBudgetHealthAsync(int year, int month, CancellationToken ct)
        {
            var budgets = await _budgetRepo.ListAsync(ct);
            var categories = await _categoryRepo.ListAsync(ct);
            var catMap = categories.ToDictionary(c => c.Id, c => c.Name);

            var results = new List<BudgetHealthResult>();
            foreach (var b in budgets)
            {
                var tracking = await _trackingRepo.GetAsync(b.Id, year, month, ct);
                var spent = tracking?.SpentAmount ?? 0m;
                var remaining = b.Amount - spent;
                catMap.TryGetValue(b.CategoryId, out var catName);

                results.Add(new BudgetHealthResult(
                    b.Id,
                    catName ?? $"Category #{b.CategoryId}",
                    b.Amount,
                    spent,
                    remaining,
                    spent > b.Amount,
                    b.Period.ToString()));
            }
            return results;
        }

        public async Task<List<RecentTransactionResult>> GetRecentTransactionsAsync(int take, CancellationToken ct)
        {
            var allTx = await _txRepo.ListRecentAsync(take, ct);
            var wallets = await _wallets.GetAllWalletsAsync(ct);
            var categories = await _categoryRepo.ListAsync(ct);
            var bankAccounts = await _bankAccountRepo.ListAsync(ct);

            var walletMap = wallets.ToDictionary(w => w.Id, w => w.Name);
            var catMap = categories.ToDictionary(c => c.Id, c => c.Name);
            var bankMap = bankAccounts.ToDictionary(a => a.Id, a =>
            {
                var last4 = a.AccountNumber.Length >= 4 ? a.AccountNumber[^4..] : a.AccountNumber;
                return $"{a.BankName} \u2022\u2022\u2022\u2022{last4}";
            });

            static string TypeLabel(PersonalTransactionType t) => t switch
            {
                PersonalTransactionType.Income => "Income",
                PersonalTransactionType.Expense => "Expense",
                PersonalTransactionType.Transfer => "Transfer",
                PersonalTransactionType.InvestmentContribution => "Investment",
                _ => t.ToString()
            };

            return allTx
                .Select(t =>
                {
                    walletMap.TryGetValue(t.WalletId, out var walletName);
                    string? catName = t.CategoryId.HasValue && catMap.TryGetValue(t.CategoryId.Value, out var cn) ? cn : null;
                    string? bank = t.SourceConnectedBankAccountId.HasValue && bankMap.TryGetValue(t.SourceConnectedBankAccountId.Value, out var bl) ? bl : null;
                    return new RecentTransactionResult(
                        t.Id, t.Date, t.Amount, TypeLabel(t.TransactionType),
                        catName, walletName ?? $"Wallet #{t.WalletId}", t.Description, bank);
                })
                .ToList();
        }

        public async Task<CashRunwayResult> GetCashRunwayAsync(CancellationToken ct)
        {
            var dto = await _dashboard.GetCashRunwayAsync(DateTime.UtcNow, ct);
            return new CashRunwayResult(
                dto.TotalBalanceNaira,
                dto.AvgMonthlyBurnNaira,
                dto.RunwayMonths,
                dto.LastMonthBurnNaira,
                dto.BurnTrend,
                DateTime.UtcNow);
        }

        // ── Tier 2: Planning Tools ────────────────────────────────

        public async Task<List<BudgetSuggestionResult>> SuggestBudgetsAsync(int lookbackMonths, CancellationToken ct)
        {
            var categories = await _categoryRepo.ListAsync(ct);
            var catMap = categories.ToDictionary(c => c.Id, c => c);

            var cutoff = DateTime.UtcNow.AddMonths(-lookbackMonths);
            var summary = await GetSpendingSummaryAsync(cutoff, DateTime.UtcNow, null, ct);

            return summary
                .Where(s => s.Type == "Expense")
                .Select(s =>
                {
                    var cat = categories.FirstOrDefault(c => c.Name == s.CategoryName);
                    var suggested = Math.Ceiling(s.TotalNaira / Math.Max(lookbackMonths, 1) * 1.10m / 1000m) * 1000m;
                    return new BudgetSuggestionResult(
                        cat?.Id ?? 0,
                        s.CategoryName,
                        Math.Round(s.TotalNaira / Math.Max(lookbackMonths, 1), 2),
                        suggested,
                        $"Based on {lookbackMonths}-month average spend + 10% buffer");
                })
                .OrderByDescending(r => r.AvgSpendNaira)
                .ToList();
        }

        public async Task<List<SpendingCutResult>> SuggestCutsAsync(decimal targetReductionNaira, CancellationToken ct)
        {
            var cutoff = DateTime.UtcNow.AddMonths(-3);
            var summary = await GetSpendingSummaryAsync(cutoff, DateTime.UtcNow, null, ct);

            var expenses = summary
                .Where(s => s.Type == "Expense")
                .OrderByDescending(s => s.TotalNaira)
                .ToList();

            var totalExpenses = expenses.Sum(e => e.TotalNaira / 3m);
            if (totalExpenses <= 0) return [];

            var results = new List<SpendingCutResult>();
            decimal remaining = targetReductionNaira;

            foreach (var e in expenses)
            {
                if (remaining <= 0) break;
                var avgMonthly = e.TotalNaira / 3m;
                var pctShare = avgMonthly / totalExpenses;
                var cut = Math.Min(remaining, Math.Round(targetReductionNaira * pctShare, 2));
                var newAmount = Math.Max(0, avgMonthly - cut);
                remaining -= cut;

                results.Add(new SpendingCutResult(
                    e.CategoryName,
                    Math.Round(avgMonthly, 2),
                    Math.Round(cut, 2),
                    Math.Round(newAmount, 2),
                    Math.Round(avgMonthly > 0 ? cut / avgMonthly * 100 : 0, 1)));
            }
            return results;
        }
    }
}
