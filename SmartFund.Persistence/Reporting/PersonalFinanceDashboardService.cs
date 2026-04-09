using Microsoft.EntityFrameworkCore;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Reporting.PersonalFinance;
using SmartFund.Domain.Enums;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Persistence.DbContext;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Persistence.Reporting
{
    public sealed class PersonalFinanceDashboardService : IPersonalFinanceDashboardService
    {
        private readonly SmartFundDbContext _db;

        public PersonalFinanceDashboardService(SmartFundDbContext db) => _db = db;

        public async Task<PersonalFinanceDashboardDto> GetAsync(long userId, DateTime utcNow, CancellationToken ct)
        {
            var year = utcNow.Year;
            var month = utcNow.Month;

            var linkedBankWalletIds = await _db.ConnectedBankAccounts
                .AsNoTracking()
                .Where(a => a.UserId == userId && a.PersonalWalletId != null)
                .Select(a => a.PersonalWalletId!.Value)
                .ToListAsync(ct);

            var walletAccountIds = await _db.PersonalWallets
                .AsNoTracking()
                .Where(w => w.UserId == userId && !linkedBankWalletIds.Contains(w.Id))
                .Select(w => w.LedgerAccountId)
                .ToListAsync(ct);

            decimal walletBalance = 0m;

            if (walletAccountIds.Count > 0)
            {
                walletBalance = await (
                    from lt in _db.LedgerTransactions.AsNoTracking()
                    from e in lt.Entries
                    where (lt.Status == TransactionStatus.Draft || lt.Status == TransactionStatus.Posted)
                          && lt.Status != TransactionStatus.Reversed
                          && walletAccountIds.Contains(e.AccountId)
                    select (decimal?)(e.Debit.Amount - e.Credit.Amount)
                ).SumAsync(ct) ?? 0m;
            }

            // Opening balances are stored on the wallet entity, not in the ledger — add them
            var openingBalanceSum = await _db.PersonalWallets
                .AsNoTracking()
                .Where(w => w.UserId == userId && !linkedBankWalletIds.Contains(w.Id))
                .SumAsync(w => (decimal?)w.OpeningBalance, ct) ?? 0m;

            walletBalance += openingBalanceSum;

            var connectedBankBalance = (await _db.ConnectedBankAccounts
                .AsNoTracking()
                .Where(a => a.UserId == userId)
                .Select(a => (decimal?)a.LastKnownBalanceKobo)
                .SumAsync(ct) ?? 0m) / 100m;

            var totalBalance = walletBalance + connectedBankBalance;

            var monthlyIncome = await (
                from p in _db.PersonalTransactions.AsNoTracking()
                join w in _db.PersonalWallets.AsNoTracking() on p.WalletId equals w.Id
                join lt in _db.LedgerTransactions.AsNoTracking() on p.LedgerTransactionId equals lt.Id
                from e in lt.Entries
                where p.TransactionType == PersonalTransactionType.Income
                      && w.UserId == userId
                      && p.Date.Year == year
                      && p.Date.Month == month
                      && lt.Status != TransactionStatus.Reversed
                      && e.AccountId == w.LedgerAccountId
                select (decimal?)e.Debit.Amount
            ).SumAsync(ct) ?? 0m;

            var monthlyExpenses = await (
                from p in _db.PersonalTransactions.AsNoTracking()
                join w in _db.PersonalWallets.AsNoTracking() on p.WalletId equals w.Id
                join lt in _db.LedgerTransactions.AsNoTracking() on p.LedgerTransactionId equals lt.Id
                from e in lt.Entries
                where p.TransactionType == PersonalTransactionType.Expense
                      && w.UserId == userId
                      && p.Date.Year == year
                      && p.Date.Month == month
                      && lt.Status != TransactionStatus.Reversed
                      && e.AccountId == w.LedgerAccountId
                select (decimal?)e.Credit.Amount
            ).SumAsync(ct) ?? 0m;

            // Materialize before grouping: EF can translate the joins/projection,
            // but may fail translating GroupBy/Sum over value objects.
            var expenseCategoryData = await (
                from p in _db.PersonalTransactions.AsNoTracking()
                join w in _db.PersonalWallets.AsNoTracking() on p.WalletId equals w.Id
                join c in _db.PersonalCategories.AsNoTracking() on p.CategoryId equals c.Id
                join lt in _db.LedgerTransactions.AsNoTracking() on p.LedgerTransactionId equals lt.Id
                from e in lt.Entries
                where p.TransactionType == PersonalTransactionType.Expense
                      && w.UserId == userId
                      && p.Date.Year == year
                      && p.Date.Month == month
                      && lt.Status != TransactionStatus.Reversed
                      && e.AccountId == w.LedgerAccountId
                select new
                {
                    CategoryId = c.Id,
                    CategoryName = c.Name,
                    Amount = e.Credit.Amount
                })
                .ToListAsync(ct);

            var topExpenseCategories = expenseCategoryData
                .GroupBy(x => new { x.CategoryId, x.CategoryName })
                .Select(g => new CategoryAmountRow(g.Key.CategoryId, g.Key.CategoryName, g.Sum(x => x.Amount)))
                .OrderByDescending(x => x.Amount)
                .Take(5)
                .ToList();

            return new PersonalFinanceDashboardDto(
                totalBalance,
                walletBalance,
                connectedBankBalance,
                monthlyIncome,
                monthlyExpenses,
                topExpenseCategories,
                0m);
        }

        public async Task<CashRunwayDto> GetCashRunwayAsync(long userId, DateTime utcNow, CancellationToken ct)
        {
            // ── Total balance (same logic as GetAsync) ────────────────────────────
            var walletAccountIds = await _db.PersonalWallets
                .AsNoTracking()
                .Where(w => w.UserId == userId)
                .Select(w => w.LedgerAccountId)
                .ToListAsync(ct);

            decimal totalBalance = 0m;
            if (walletAccountIds.Count > 0)
            {
                totalBalance = await (
                    from lt in _db.LedgerTransactions.AsNoTracking()
                    from e in lt.Entries
                    where (lt.Status == TransactionStatus.Draft || lt.Status == TransactionStatus.Posted)
                          && lt.Status != TransactionStatus.Reversed
                          && walletAccountIds.Contains(e.AccountId)
                    select (decimal?)(e.Debit.Amount - e.Credit.Amount)
                ).SumAsync(ct) ?? 0m;
            }

            // Opening balances are stored on the wallet entity, not in the ledger — add them
            var openingBalanceSum = await _db.PersonalWallets
                .AsNoTracking()
                .Where(w => w.UserId == userId)
                .SumAsync(w => (decimal?)w.OpeningBalance, ct) ?? 0m;
            totalBalance += openingBalanceSum;

            // ── Expenses over last 3 complete calendar months ─────────────────────
            // e.g. if today is 25 Mar 2026, the window is Dec 2025, Jan 2026, Feb 2026
            var currentMonthStart = new DateTime(utcNow.Year, utcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
            var windowStart = currentMonthStart.AddMonths(-3);

            var expenseRows = await (
                from p in _db.PersonalTransactions.AsNoTracking()
                join w in _db.PersonalWallets.AsNoTracking() on p.WalletId equals w.Id
                join lt in _db.LedgerTransactions.AsNoTracking() on p.LedgerTransactionId equals lt.Id
                from e in lt.Entries
                where p.TransactionType == PersonalTransactionType.Expense
                      && w.UserId == userId
                      && lt.Status != TransactionStatus.Reversed
                      && e.AccountId == w.LedgerAccountId
                      && p.Date >= windowStart
                      && p.Date < currentMonthStart
                select new { Year = p.Date.Year, Month = p.Date.Month, Amount = e.Credit.Amount }
            ).ToListAsync(ct);

            // Build per-month totals for each of the 3 months (fill 0 for months with no data)
            var monthTotals = expenseRows
                .GroupBy(x => (x.Year, x.Month))
                .ToDictionary(g => g.Key, g => g.Sum(x => x.Amount));

            var perMonth = new decimal[3];
            for (int i = 0; i < 3; i++)
            {
                var m = currentMonthStart.AddMonths(-(i + 1));
                perMonth[i] = monthTotals.TryGetValue((m.Year, m.Month), out var v) ? v : 0m;
            }

            var avgMonthlyBurn = (perMonth[0] + perMonth[1] + perMonth[2]) / 3m;
            var lastMonthBurn = perMonth[0]; // most recent complete month

            decimal? runwayMonths = avgMonthlyBurn > 0 ? totalBalance / avgMonthlyBurn : null;

            // Trend: how much last month's burn deviates from the 3-month average
            decimal burnTrend = avgMonthlyBurn > 0
                ? (lastMonthBurn - avgMonthlyBurn) / avgMonthlyBurn
                : 0m;

            return new CashRunwayDto(totalBalance, avgMonthlyBurn, runwayMonths, lastMonthBurn, burnTrend);
        }
    }
}
