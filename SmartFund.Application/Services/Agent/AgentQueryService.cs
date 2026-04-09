using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Reporting.PersonalFinance;
using SmartFund.Application.UseCases.PersonalFinance;
using SmartFund.Domain.Exceptions;
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

    public sealed record TopCategoryResult(
        string CategoryName, string Type, decimal TotalNaira,
        decimal PctOfTotal, int TransactionCount, int Rank);

    public sealed record IncomeSourceResult(
        string CategoryName, decimal TotalNaira, decimal PctOfTotal, int TransactionCount);

    public sealed record CategoryTrendResult(
        string CategoryName, int Year, int Month, decimal TotalNaira, int TransactionCount);

    public sealed record NetWorthResult(
        decimal TotalNaira, List<WalletBalanceResult> Wallets, DateTime CalculatedAt);

    public sealed record SavingsRateResult(
        int Year, int Month, decimal IncomeNaira, decimal ExpensesNaira,
        decimal SavingsNaira, decimal SavingsRatePct);

    public sealed record SavingsRateReport(
        List<SavingsRateResult> Monthly, decimal AverageSavingsRatePct, decimal TotalSavedNaira);

    public sealed record MtdSummaryResult(
        decimal MtdIncomeNaira, decimal MtdExpensesNaira, decimal MtdNetNaira,
        decimal PrevMonthIncomeNaira, decimal PrevMonthExpensesNaira, decimal PrevMonthNetNaira,
        decimal IncomeChangePct, decimal ExpensesChangePct, int DaysElapsed, int DaysInMonth);

    public sealed record SpendingByPeriodResult(
        string PeriodLabel, DateTime PeriodStart, decimal TotalNaira, int TransactionCount);

    public sealed record GoalSavePlanResult(
        long GoalId, string Name, decimal TargetNaira, decimal SavedNaira, decimal RemainingNaira,
        DateTime Deadline, int MonthsRemaining, decimal RequiredMonthlyNaira,
        bool IsOnTrack, bool IsComplete, bool IsOverdue);

    public sealed record RecurringPatternResult(
        string Description, string? CategoryName, int OccurrenceCount,
        decimal AvgAmountNaira, decimal TotalNaira, DateTime MostRecentDate);

    public sealed record DebtOverviewResult(
        int TotalCount, int ActiveCount, int OverdueCount,
        decimal TotalOwed, decimal TotalPaid, decimal TotalRemaining,
        decimal TotalInterest, DateTime? EarliestDueDate);

    public sealed record DebtListItemResult(
        long DebtId, string CreditorName,
        decimal PrincipalAmount, decimal TotalAmountDue,
        decimal TotalPaid, decimal RemainingBalance,
        decimal ProgressPercent, DateTime DueDate,
        int DaysUntilDue, string Status, string UrgencyBadge,
        string? Description);

    public sealed record DebtInsightsSummaryResult(
        decimal TotalOwed, decimal TotalInterest, decimal TotalPaid,
        decimal PercentPaid, decimal AvgMonthlyIncome, decimal AvgMonthlyExpenses,
        decimal AvgMonthlySavings, bool SavingsInsufficient,
        decimal MonthlyDebtBurden, decimal BurdenPercent,
        DateTime? DebtFreeDate,
        List<RankedDebt> UrgencyRanking);

    public sealed record DebtPaymentRecord(
        long PaymentId, long DebtId, string CreditorName,
        decimal Amount, DateTime PaidOn, string? Note, DateTime RecordedAt);

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
        private readonly IPersonalDebtRepository _debtRepo;

        public AgentQueryService(
            IPersonalWalletService wallets,
            IPersonalTransactionRepository txRepo,
            IPersonalCategoryRepository categoryRepo,
            IPersonalGoalRepository goalRepo,
            IPersonalBudgetRepository budgetRepo,
            IPersonalBudgetTrackingRepository trackingRepo,
            IConnectedBankAccountRepository bankAccountRepo,
            IPersonalFinanceReportService reports,
            IPersonalFinanceDashboardService dashboard,
            IPersonalDebtRepository debtRepo)
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
            _debtRepo = debtRepo;
        }

        // ── Tier 1: Read Tools ────────────────────────────────────

        public async Task<List<WalletBalanceResult>> GetWalletBalancesAsync(long userId, CancellationToken ct)
        {
            var wallets = await _wallets.GetAllWalletsByUserAsync(userId, ct);
            var bankAccounts = await _bankAccountRepo.ListByUserAsync(userId, ct);
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
            long userId, DateTime fromDate, DateTime toDate, long[]? categoryIds, CancellationToken ct)
        {
            var allTx = await _txRepo.ListByUserAndDateRangeAsync(userId, fromDate, toDate, ct);
            var categories = await _categoryRepo.ListByUserAsync(userId, ct);
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

        public async Task<List<CashFlowResult>> GetCashFlowAsync(long userId, int months, CancellationToken ct)
        {
            var rows = await _reports.CashFlowReportAsync(userId, ct);
            var cutoff = DateTime.UtcNow.AddMonths(-months);

            return rows
                .Where(r => new DateTime(r.Year, r.Month, 1, 0, 0, 0, DateTimeKind.Utc) >= new DateTime(cutoff.Year, cutoff.Month, 1, 0, 0, 0, DateTimeKind.Utc))
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

        public async Task<List<GoalProgressResult>> GetGoalProgressAsync(long userId, long? goalId, CancellationToken ct)
        {
            var goals = goalId.HasValue
                ? new List<SmartFund.Domain.PersonalFinance.Entities.PersonalGoal?> { await _goalRepo.GetByIdForUserAsync(goalId.Value, userId, ct) }
                    .Where(g => g is not null).Cast<SmartFund.Domain.PersonalFinance.Entities.PersonalGoal>().ToList()
                : await _goalRepo.ListByUserAsync(userId, ct);

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

        public async Task<List<BudgetHealthResult>> GetBudgetHealthAsync(long userId, int year, int month, CancellationToken ct)
        {
            var budgets = await _budgetRepo.ListByUserAsync(userId, ct);
            var categories = await _categoryRepo.ListByUserAsync(userId, ct);
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

        public async Task<List<RecentTransactionResult>> GetRecentTransactionsAsync(long userId, int take, CancellationToken ct)
        {
            var allTx = await _txRepo.ListRecentByUserAsync(userId, take, ct);
            var wallets = await _wallets.GetAllWalletsByUserAsync(userId, ct);
            var categories = await _categoryRepo.ListByUserAsync(userId, ct);
            var bankAccounts = await _bankAccountRepo.ListByUserAsync(userId, ct);

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

        public async Task<CashRunwayResult> GetCashRunwayAsync(long userId, CancellationToken ct)
        {
            var dto = await _dashboard.GetCashRunwayAsync(userId, DateTime.UtcNow, ct);
            return new CashRunwayResult(
                dto.TotalBalanceNaira,
                dto.AvgMonthlyBurnNaira,
                dto.RunwayMonths,
                dto.LastMonthBurnNaira,
                dto.BurnTrend,
                DateTime.UtcNow);
        }

        // ── Tier 2: Planning Tools ────────────────────────────────

        public async Task<List<BudgetSuggestionResult>> SuggestBudgetsAsync(long userId, int lookbackMonths, CancellationToken ct)
        {
            var categories = await _categoryRepo.ListByUserAsync(userId, ct);

            var cutoff = DateTime.UtcNow.AddMonths(-lookbackMonths);
            var summary = await GetSpendingSummaryAsync(userId, cutoff, DateTime.UtcNow, null, ct);

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

        public async Task<List<SpendingCutResult>> SuggestCutsAsync(long userId, decimal targetReductionNaira, CancellationToken ct)
        {
            var cutoff = DateTime.UtcNow.AddMonths(-3);
            var summary = await GetSpendingSummaryAsync(userId, cutoff, DateTime.UtcNow, null, ct);

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

        // ── Tier 3: Extended Query Tools ──────────────────────────

        public async Task<List<TopCategoryResult>> GetTopCategoriesAsync(
            long userId, DateTime fromDate, DateTime toDate, int limit, string? type, CancellationToken ct)
        {
            var allTx = await _txRepo.ListByUserAndDateRangeAsync(userId, fromDate, toDate, ct);
            var categories = await _categoryRepo.ListByUserAsync(userId, ct);
            var catMap = categories.ToDictionary(c => c.Id);

            var filtered = allTx.Where(t =>
                (t.TransactionType == PersonalTransactionType.Income ||
                 t.TransactionType == PersonalTransactionType.Expense) &&
                t.CategoryId.HasValue);

            if (!string.IsNullOrWhiteSpace(type))
            {
                var isIncome = type.Equals("Income", StringComparison.OrdinalIgnoreCase);
                var targetEnum = isIncome ? PersonalTransactionType.Income : PersonalTransactionType.Expense;
                filtered = filtered.Where(t => t.TransactionType == targetEnum);
            }

            var grouped = filtered
                .GroupBy(t => t.CategoryId!.Value)
                .Select(g =>
                {
                    catMap.TryGetValue(g.Key, out var cat);
                    var typeName = cat?.Type == PersonalCategoryType.Income ? "Income" : "Expense";
                    return new { CategoryId = g.Key, CategoryName = cat?.Name ?? $"Category #{g.Key}", Type = typeName, Total = g.Sum(t => t.Amount), Count = g.Count() };
                })
                .OrderByDescending(x => x.Total)
                .ToList();

            var grandTotal = grouped.Sum(x => x.Total);
            return grouped
                .Take(limit <= 0 ? 5 : limit)
                .Select((x, i) => new TopCategoryResult(
                    x.CategoryName, x.Type, x.Total,
                    grandTotal > 0 ? Math.Round(x.Total / grandTotal * 100, 1) : 0m,
                    x.Count, i + 1))
                .ToList();
        }

        public async Task<List<IncomeSourceResult>> GetIncomeSourcesAsync(
            long userId, DateTime fromDate, DateTime toDate, CancellationToken ct)
        {
            var allTx = await _txRepo.ListByUserAndDateRangeAsync(userId, fromDate, toDate, ct);
            var categories = await _categoryRepo.ListByUserAsync(userId, ct);
            var catMap = categories.ToDictionary(c => c.Id);

            var incomeTx = allTx.Where(t =>
                t.TransactionType == PersonalTransactionType.Income && t.CategoryId.HasValue);

            var grouped = incomeTx
                .GroupBy(t => t.CategoryId!.Value)
                .Select(g =>
                {
                    catMap.TryGetValue(g.Key, out var cat);
                    return new { CategoryName = cat?.Name ?? $"Category #{g.Key}", Total = g.Sum(t => t.Amount), Count = g.Count() };
                })
                .OrderByDescending(x => x.Total)
                .ToList();

            var totalIncome = grouped.Sum(x => x.Total);
            return grouped.Select(x => new IncomeSourceResult(
                x.CategoryName, x.Total,
                totalIncome > 0 ? Math.Round(x.Total / totalIncome * 100, 1) : 0m,
                x.Count)).ToList();
        }

        public async Task<List<CategoryTrendResult>> GetCategoryTrendAsync(
            long userId, string categoryName, int months, CancellationToken ct)
        {
            var categories = await _categoryRepo.ListByUserAsync(userId, ct);
            var matches = categories
                .Where(c => c.Name.Contains(categoryName, StringComparison.OrdinalIgnoreCase))
                .ToList();
            if (matches.Count == 0) return [];

            var matchIds = matches.Select(c => c.Id).ToHashSet();
            var from = DateTime.UtcNow.AddMonths(-months);
            var allTx = await _txRepo.ListByUserAndDateRangeAsync(userId, from, DateTime.UtcNow, ct);

            var filtered = allTx.Where(t => t.CategoryId.HasValue && matchIds.Contains(t.CategoryId.Value));

            return filtered
                .GroupBy(t => new { t.CategoryId!.Value, Year = t.Date.Year, Month = t.Date.Month })
                .Select(g =>
                {
                    var catName = matches.FirstOrDefault(c => c.Id == g.Key.Value)?.Name ?? $"Category #{g.Key.Value}";
                    return new CategoryTrendResult(catName, g.Key.Year, g.Key.Month, g.Sum(t => t.Amount), g.Count());
                })
                .OrderBy(r => r.Year).ThenBy(r => r.Month)
                .ToList();
        }

        public async Task<NetWorthResult> GetNetWorthAsync(long userId, CancellationToken ct)
        {
            var wallets = await GetWalletBalancesAsync(userId, ct);
            var total = wallets.Sum(w => w.BalanceNaira);
            return new NetWorthResult(total, wallets, DateTime.UtcNow);
        }

        public async Task<SavingsRateReport> GetSavingsRateAsync(long userId, int months, CancellationToken ct)
        {
            var from = DateTime.UtcNow.AddMonths(-months);
            var allTx = await _txRepo.ListByUserAndDateRangeAsync(userId, from, DateTime.UtcNow, ct);

            var monthly = allTx
                .Where(t => t.TransactionType == PersonalTransactionType.Income ||
                            t.TransactionType == PersonalTransactionType.Expense)
                .GroupBy(t => new { t.Date.Year, t.Date.Month })
                .Select(g =>
                {
                    var income = g.Where(t => t.TransactionType == PersonalTransactionType.Income).Sum(t => t.Amount);
                    var expenses = g.Where(t => t.TransactionType == PersonalTransactionType.Expense).Sum(t => t.Amount);
                    var savings = income - expenses;
                    var rate = income > 0 ? Math.Round(savings / income * 100, 1) : 0m;
                    return new SavingsRateResult(g.Key.Year, g.Key.Month, income, expenses, savings, rate);
                })
                .OrderBy(r => r.Year).ThenBy(r => r.Month)
                .ToList();

            var avgRate = monthly.Count > 0 ? Math.Round(monthly.Average(r => r.SavingsRatePct), 1) : 0m;
            var totalSaved = monthly.Sum(r => r.SavingsNaira);
            return new SavingsRateReport(monthly, avgRate, totalSaved);
        }

        public async Task<MtdSummaryResult> GetMtdSummaryAsync(long userId, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var mtdStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var mtdEnd = now;

            var prevMonthStart = mtdStart.AddMonths(-1);
            var prevMonthEnd = mtdStart.AddTicks(-1);

            var mtdTx = await _txRepo.ListByUserAndDateRangeAsync(userId, mtdStart, mtdEnd, ct);
            var prevTx = await _txRepo.ListByUserAndDateRangeAsync(userId, prevMonthStart, prevMonthEnd, ct);

            decimal MtdIncome(IEnumerable<SmartFund.Domain.PersonalFinance.Entities.PersonalTransaction> tx) =>
                tx.Where(t => t.TransactionType == PersonalTransactionType.Income).Sum(t => t.Amount);
            decimal MtdExpenses(IEnumerable<SmartFund.Domain.PersonalFinance.Entities.PersonalTransaction> tx) =>
                tx.Where(t => t.TransactionType == PersonalTransactionType.Expense).Sum(t => t.Amount);

            var mtdIncome = MtdIncome(mtdTx);
            var mtdExpenses = MtdExpenses(mtdTx);
            var prevIncome = MtdIncome(prevTx);
            var prevExpenses = MtdExpenses(prevTx);

            var incomeChangePct = prevIncome > 0 ? Math.Round((mtdIncome - prevIncome) / prevIncome * 100, 1) : 0m;
            var expensesChangePct = prevExpenses > 0 ? Math.Round((mtdExpenses - prevExpenses) / prevExpenses * 100, 1) : 0m;
            var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);

            return new MtdSummaryResult(
                mtdIncome, mtdExpenses, mtdIncome - mtdExpenses,
                prevIncome, prevExpenses, prevIncome - prevExpenses,
                incomeChangePct, expensesChangePct,
                now.Day, daysInMonth);
        }

        public async Task<List<SpendingByPeriodResult>> GetSpendingByPeriodAsync(
            long userId, DateTime fromDate, DateTime toDate, string groupBy, CancellationToken ct)
        {
            var allTx = await _txRepo.ListByUserAndDateRangeAsync(userId, fromDate, toDate, ct);
            var expenses = allTx.Where(t => t.TransactionType == PersonalTransactionType.Expense);

            return groupBy.ToLowerInvariant() switch
            {
                "week" => expenses
                    .GroupBy(t => GetWeekStart(t.Date))
                    .Select(g => new SpendingByPeriodResult(
                        $"Week of {g.Key:d MMM}",
                        DateTime.SpecifyKind(g.Key, DateTimeKind.Utc),
                        g.Sum(t => t.Amount), g.Count()))
                    .OrderBy(r => r.PeriodStart).ToList(),

                "month" => expenses
                    .GroupBy(t => new DateTime(t.Date.Year, t.Date.Month, 1))
                    .Select(g => new SpendingByPeriodResult(
                        g.Key.ToString("MMMM yyyy"),
                        DateTime.SpecifyKind(g.Key, DateTimeKind.Utc),
                        g.Sum(t => t.Amount), g.Count()))
                    .OrderBy(r => r.PeriodStart).ToList(),

                _ => expenses
                    .GroupBy(t => t.Date.Date)
                    .Select(g => new SpendingByPeriodResult(
                        g.Key.ToString("ddd d MMM"),
                        DateTime.SpecifyKind(g.Key, DateTimeKind.Utc),
                        g.Sum(t => t.Amount), g.Count()))
                    .OrderBy(r => r.PeriodStart).ToList()
            };
        }

        private static DateTime GetWeekStart(DateTime date)
        {
            var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
            return date.Date.AddDays(-diff);
        }

        public async Task<List<GoalSavePlanResult>> GetGoalSavePlanAsync(
            long userId, long? goalId, CancellationToken ct)
        {
            var goals = goalId.HasValue
                ? new List<SmartFund.Domain.PersonalFinance.Entities.PersonalGoal?> { await _goalRepo.GetByIdForUserAsync(goalId.Value, userId, ct) }
                    .Where(g => g is not null).Cast<SmartFund.Domain.PersonalFinance.Entities.PersonalGoal>().ToList()
                : await _goalRepo.ListByUserAsync(userId, ct);

            var utcNow = DateTime.UtcNow;
            return goals.Select(g =>
            {
                var isComplete = g.SavedAmount >= g.TargetAmount;
                var isOverdue = !isComplete && g.Deadline <= utcNow;
                var remaining = Math.Max(0m, g.TargetAmount - g.SavedAmount);
                var monthsLeft = g.Deadline > utcNow
                    ? (int)Math.Ceiling((g.Deadline - utcNow).TotalDays / 30.44)
                    : 0;
                var requiredMonthly = !isComplete && monthsLeft > 0
                    ? Math.Round(remaining / monthsLeft, 2)
                    : 0m;
                return new GoalSavePlanResult(
                    g.Id, g.Name, g.TargetAmount, g.SavedAmount, remaining,
                    g.Deadline, monthsLeft, requiredMonthly,
                    !isComplete && !isOverdue && monthsLeft > 0,
                    isComplete, isOverdue);
            }).ToList();
        }

        public async Task<List<RecentTransactionResult>> GetWalletTransactionsAsync(
            long userId, long walletId, DateTime? fromDate, DateTime? toDate, int take, CancellationToken ct)
        {
            var walletTx = await _txRepo.ListByWalletIdAsync(walletId, ct);
            var categories = await _categoryRepo.ListByUserAsync(userId, ct);
            var wallets = await _wallets.GetAllWalletsByUserAsync(userId, ct);
            var bankAccounts = await _bankAccountRepo.ListByUserAsync(userId, ct);

            var catMap = categories.ToDictionary(c => c.Id, c => c.Name);
            var walletMap = wallets.ToDictionary(w => w.Id, w => w.Name);
            var bankMap = bankAccounts.ToDictionary(a => a.Id, a =>
            {
                var last4 = a.AccountNumber.Length >= 4 ? a.AccountNumber[^4..] : a.AccountNumber;
                return $"{a.BankName} \u2022\u2022\u2022\u2022{last4}";
            });

            var filtered = walletTx.AsEnumerable();
            if (fromDate.HasValue) filtered = filtered.Where(t => t.Date >= fromDate.Value);
            if (toDate.HasValue) filtered = filtered.Where(t => t.Date <= toDate.Value);

            static string TypeLabel(PersonalTransactionType t) => t switch
            {
                PersonalTransactionType.Income => "Income",
                PersonalTransactionType.Expense => "Expense",
                PersonalTransactionType.Transfer => "Transfer",
                _ => t.ToString()
            };

            return filtered
                .OrderByDescending(t => t.Date)
                .Take(take <= 0 ? 30 : take)
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

        // ── Debt Query Tools ──────────────────────────────────────────

        public async Task<DebtOverviewResult> GetDebtOverviewAsync(long userId, CancellationToken ct)
        {
            var debts = await _debtRepo.ListByUserAsync(userId, ct);
            var active = debts.Where(d => d.Status == DebtStatus.Active).ToList();
            var overdue = active.Where(d => d.DaysUntilDue < 0).ToList();

            return new DebtOverviewResult(
                TotalCount: debts.Count,
                ActiveCount: active.Count,
                OverdueCount: overdue.Count,
                TotalOwed: active.Sum(d => d.TotalAmountDue),
                TotalPaid: active.Sum(d => d.TotalPaid),
                TotalRemaining: active.Sum(d => d.RemainingBalance),
                TotalInterest: active.Sum(d => d.InterestAmount),
                EarliestDueDate: active.Any() ? active.Min(d => d.DueDate) : null);
        }

        public async Task<List<DebtListItemResult>> GetDebtListAsync(long userId, string? status, CancellationToken ct)
        {
            var debts = await _debtRepo.ListByUserAsync(userId, ct);
            var filtered = debts.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(status))
            {
                if (Enum.TryParse<DebtStatus>(status, ignoreCase: true, out var statusEnum))
                    filtered = filtered.Where(d => d.Status == statusEnum);
            }

            return filtered
                .OrderBy(d => d.DaysUntilDue)
                .Select(d =>
                {
                    var days = d.DaysUntilDue;
                    var badge = days < 0 ? "Overdue"
                        : days <= 7 ? "Critical"
                        : days <= 30 ? "Soon"
                        : days <= 90 ? "Upcoming"
                        : "Future";

                    return new DebtListItemResult(
                        d.Id, d.CreditorName,
                        d.PrincipalAmount, d.TotalAmountDue,
                        d.TotalPaid, d.RemainingBalance,
                        d.ProgressPercent, d.DueDate,
                        days, d.Status.ToString(), badge,
                        d.Description);
                })
                .ToList();
        }

        public async Task<DebtInsightsSummaryResult> GetDebtInsightsAsync(long userId, CancellationToken ct)
        {
            var now = DateTime.UtcNow;
            var windowStart = now.AddDays(-90);

            var debts = await _debtRepo.ListByUserAsync(userId, ct);
            var transactions = await _txRepo.ListByUserAndDateRangeAsync(userId, windowStart, now, ct);

            var totalIncome = transactions.Where(t => t.TransactionType == PersonalTransactionType.Income).Sum(t => t.Amount);
            var totalExpenses = transactions.Where(t => t.TransactionType == PersonalTransactionType.Expense).Sum(t => t.Amount);

            var avgMonthlyIncome = decimal.Round(totalIncome / 3m, 2);
            var avgMonthlyExpenses = decimal.Round(totalExpenses / 3m, 2);
            var avgMonthlySavings = decimal.Round(avgMonthlyIncome - avgMonthlyExpenses, 2);
            var savingsInsufficient = avgMonthlySavings <= 0m;

            var activeDebts = debts.Where(d => d.Status != DebtStatus.Forgiven).ToList();
            var totalOwed = activeDebts.Sum(d => d.TotalAmountDue);
            var totalInterest = activeDebts.Sum(d => d.InterestAmount);
            var totalPaid = activeDebts.Sum(d => d.TotalPaid);
            var percentPaid = totalOwed > 0m ? decimal.Round((totalPaid / totalOwed) * 100m, 2) : 100m;

            var firstOfThisMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var firstOfLastMonth = firstOfThisMonth.AddMonths(-1);
            var priorMonthPayments = debts
                .SelectMany(d => d.Payments)
                .Where(p => p.PaidOn >= firstOfLastMonth && p.PaidOn < firstOfThisMonth)
                .Sum(p => p.Amount);
            var burdenPercent = avgMonthlyIncome > 0m
                ? decimal.Round((priorMonthPayments / avgMonthlyIncome) * 100m, 2)
                : 0m;

            var unpaidDebts = activeDebts.Where(d => d.Status == DebtStatus.Active).ToList();
            var totalRemaining = unpaidDebts.Sum(d => d.RemainingBalance);
            DateTime? debtFreeDate = null;
            if (!savingsInsufficient && totalRemaining > 0m)
                debtFreeDate = now.AddDays((double)(totalRemaining / (avgMonthlySavings / 30.44m)));
            else if (totalRemaining == 0m)
                debtFreeDate = now;

            var urgencyRanking = unpaidDebts
                .OrderBy(d => d.DaysUntilDue)
                .Select(d =>
                {
                    var days = d.DaysUntilDue;
                    var badge = days < 0 ? "Overdue"
                        : days <= 7 ? "Critical"
                        : days <= 30 ? "Soon"
                        : days <= 90 ? "Upcoming"
                        : "Future";
                    return new RankedDebt(
                        d.Id, d.CreditorName, d.RemainingBalance, days, badge);
                }).ToList();

            return new DebtInsightsSummaryResult(
                totalOwed, totalInterest, totalPaid, percentPaid,
                avgMonthlyIncome, avgMonthlyExpenses, avgMonthlySavings, savingsInsufficient,
                priorMonthPayments, burdenPercent, debtFreeDate, urgencyRanking);
        }

        public async Task<List<DebtPaymentRecord>> GetDebtPaymentHistoryAsync(long userId, long debtId, CancellationToken ct)
        {
            var debt = await _debtRepo.GetByIdForUserAsync(debtId, userId, ct)
                ?? throw new DomainException($"Debt #{debtId} not found.");

            return debt.Payments
                .OrderByDescending(p => p.PaidOn)
                .Select(p => new DebtPaymentRecord(
                    p.Id, debt.Id, debt.CreditorName,
                    p.Amount, p.PaidOn, p.Note, p.RecordedAt))
                .ToList();
        }

        public async Task<List<RecurringPatternResult>> GetRecurringPatternsAsync(
            long userId, int lookbackMonths, CancellationToken ct)
        {
            var from = DateTime.UtcNow.AddMonths(-lookbackMonths);
            var allTx = await _txRepo.ListByUserAndDateRangeAsync(userId, from, DateTime.UtcNow, ct);
            var categories = await _categoryRepo.ListByUserAsync(userId, ct);
            var catMap = categories.ToDictionary(c => c.Id, c => c.Name);

            var withDesc = allTx
                .Where(t => !string.IsNullOrWhiteSpace(t.Description) && t.Amount > 0);

            return withDesc
                .GroupBy(t => t.Description!.Trim().ToLowerInvariant())
                .Where(g =>
                {
                    var months = g.Select(t => new { t.Date.Year, t.Date.Month }).Distinct().Count();
                    return months >= 2;
                })
                .Select(g =>
                {
                    var items = g.ToList();
                    var total = items.Sum(t => t.Amount);
                    var avg = total / items.Count;
                    var mostRecent = items.Max(t => t.Date);
                    var mostCommonCatId = items
                        .Where(t => t.CategoryId.HasValue)
                        .GroupBy(t => t.CategoryId!.Value)
                        .OrderByDescending(cg => cg.Count())
                        .FirstOrDefault()?.Key;
                    string? catName = mostCommonCatId.HasValue && catMap.TryGetValue(mostCommonCatId.Value, out var cn) ? cn : null;
                    var displayDesc = items.First().Description!.Trim();
                    return new RecurringPatternResult(displayDesc, catName, items.Count, Math.Round(avg, 2), total, mostRecent);
                })
                .Where(r => r.AvgAmountNaira > 0)
                .OrderByDescending(r => r.TotalNaira)
                .ToList();
        }
    }
}
