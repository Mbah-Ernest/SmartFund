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
    public sealed class PersonalFinanceReportService : IPersonalFinanceReportService
    {
        private readonly SmartFundDbContext _db;

        public PersonalFinanceReportService(SmartFundDbContext db) => _db = db;

        public async Task<List<MonthlyCategoryAmountRow>> MonthlyIncomeReportAsync(long userId, CancellationToken ct)
        {
            // Materialize before grouping: EF can translate the joins/projection,
            // but may fail translating GroupBy/Sum over value objects.
            var data = await (
                from p in _db.PersonalTransactions.AsNoTracking()
                join w in _db.PersonalWallets.AsNoTracking() on p.WalletId equals w.Id
                join c in _db.PersonalCategories.AsNoTracking() on p.CategoryId equals c.Id
                join lt in _db.LedgerTransactions.AsNoTracking() on p.LedgerTransactionId equals lt.Id
                from e in lt.Entries
                where p.TransactionType == PersonalTransactionType.Income
                      && w.UserId == userId
                      && c.Type == PersonalCategoryType.Income
                      && lt.Status != TransactionStatus.Reversed
                      && e.AccountId == w.LedgerAccountId
                select new
                {
                    w.Id,
                    w.Name,
                    Year = p.Date.Year,
                    Month = p.Date.Month,
                    CategoryId = c.Id,
                    CategoryName = c.Name,
                    Amount = e.Debit.Amount
                })
                .ToListAsync(ct);

            return data
                .GroupBy(x => new { x.Id, x.Name, x.Year, x.Month, x.CategoryId, x.CategoryName })
                .Select(g => new MonthlyCategoryAmountRow(
                    g.Key.Id,
                    g.Key.Name,
                    g.Key.Year,
                    g.Key.Month,
                    g.Key.CategoryId,
                    g.Key.CategoryName,
                    g.Sum(x => x.Amount)))
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ThenBy(x => x.WalletName)
                .ThenBy(x => x.CategoryName)
                .ToList();
        }

        public async Task<List<MonthlyCategoryAmountRow>> MonthlyExpenseReportAsync(long userId, CancellationToken ct)
        {
            // Materialize before grouping: EF can translate the joins/projection,
            // but may fail translating GroupBy/Sum over value objects.
            var data = await (
                from p in _db.PersonalTransactions.AsNoTracking()
                join w in _db.PersonalWallets.AsNoTracking() on p.WalletId equals w.Id
                join c in _db.PersonalCategories.AsNoTracking() on p.CategoryId equals c.Id
                join lt in _db.LedgerTransactions.AsNoTracking() on p.LedgerTransactionId equals lt.Id
                from e in lt.Entries
                where p.TransactionType == PersonalTransactionType.Expense
                      && w.UserId == userId
                      && c.Type == PersonalCategoryType.Expense
                      && lt.Status != TransactionStatus.Reversed
                      && e.AccountId == w.LedgerAccountId
                select new
                {
                    w.Id,
                    w.Name,
                    Year = p.Date.Year,
                    Month = p.Date.Month,
                    CategoryId = c.Id,
                    CategoryName = c.Name,
                    Amount = e.Credit.Amount
                })
                .ToListAsync(ct);

            return data
                .GroupBy(x => new { x.Id, x.Name, x.Year, x.Month, x.CategoryId, x.CategoryName })
                .Select(g => new MonthlyCategoryAmountRow(
                    g.Key.Id,
                    g.Key.Name,
                    g.Key.Year,
                    g.Key.Month,
                    g.Key.CategoryId,
                    g.Key.CategoryName,
                    g.Sum(x => x.Amount)))
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ThenBy(x => x.WalletName)
                .ThenBy(x => x.CategoryName)
                .ToList();
        }

        public async Task<List<CashFlowRow>> CashFlowReportAsync(long userId, CancellationToken ct)
        {
            var incomeExpense = await (
                from p in _db.PersonalTransactions.AsNoTracking()
                join w in _db.PersonalWallets.AsNoTracking() on p.WalletId equals w.Id
                join lt in _db.LedgerTransactions.AsNoTracking() on p.LedgerTransactionId equals lt.Id
                from e in lt.Entries
                where (p.TransactionType == PersonalTransactionType.Income
                       || p.TransactionType == PersonalTransactionType.Expense
                       || p.TransactionType == PersonalTransactionType.Transfer)
                      && w.UserId == userId
                      && lt.Status != TransactionStatus.Reversed
                      && e.AccountId == w.LedgerAccountId
                select new
                {
                    WalletId = w.Id,
                    WalletName = w.Name,
                    Year = p.Date.Year,
                    Month = p.Date.Month,
                    CategoryId = p.CategoryId ?? 0,
                    CategoryName = p.CategoryId == null ? "Transfer" : "",
                    TxType = p.TransactionType,
                    Debit = e.Debit.Amount,
                    Credit = e.Credit.Amount
                })
                .ToListAsync(ct);

            // Fill category names for income/expense in-memory (avoids extra joins in SQL for transfer rows)
            var categoryNames = await _db.PersonalCategories.AsNoTracking()
                .Where(x => x.UserId == userId)
                .ToDictionaryAsync(x => x.Id, x => x.Name, ct);

            var normalized = incomeExpense.Select(x => new
            {
                x.WalletId,
                x.WalletName,
                x.Year,
                x.Month,
                CategoryId = x.CategoryId,
                CategoryName = x.CategoryId == 0 ? "Transfer" : (categoryNames.TryGetValue(x.CategoryId, out var n) ? n : "Unknown"),
                Inflow = x.Debit,
                Outflow = x.Credit
            });

            var all = normalized
                .Select(x => new { x.WalletId, x.WalletName, x.Year, x.Month, x.CategoryId, x.CategoryName, x.Inflow, x.Outflow });

            var rows = all
                .GroupBy(x => new { x.WalletId, x.WalletName, x.Year, x.Month, x.CategoryId, x.CategoryName })
                .Select(g =>
                {
                    var inflow = g.Sum(x => x.Inflow);
                    var outflow = g.Sum(x => x.Outflow);
                    return new CashFlowRow(
                        g.Key.WalletId,
                        g.Key.WalletName,
                        g.Key.Year,
                        g.Key.Month,
                        g.Key.CategoryId,
                        g.Key.CategoryName,
                        inflow,
                        outflow,
                        inflow - outflow);
                })
                .OrderBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ThenBy(x => x.WalletName)
                .ThenBy(x => x.CategoryName)
                .ToList();

            return rows;
        }

        public async Task<List<WalletBalanceRow>> WalletBalanceReportAsync(long userId, CancellationToken ct)
        {
            // Monthly movement per wallet derived from ledger entries (wallet entry only), then cumulatively summed.
            var movements = await (
                from p in _db.PersonalTransactions.AsNoTracking()
                join w in _db.PersonalWallets.AsNoTracking() on p.WalletId equals w.Id
                join lt in _db.LedgerTransactions.AsNoTracking() on p.LedgerTransactionId equals lt.Id
                from e in lt.Entries
                where lt.Status != TransactionStatus.Reversed
                      && w.UserId == userId
                      && e.AccountId == w.LedgerAccountId
                select new
                {
                    WalletId = w.Id,
                    WalletName = w.Name,
                    Year = p.Date.Year,
                    Month = p.Date.Month,
                    Delta = e.Debit.Amount - e.Credit.Amount
                })
                .ToListAsync(ct);

            var monthly = movements
                .GroupBy(x => new { x.WalletId, x.WalletName, x.Year, x.Month })
                .Select(g => new
                {
                    g.Key.WalletId,
                    g.Key.WalletName,
                    g.Key.Year,
                    g.Key.Month,
                    Delta = g.Sum(x => x.Delta)
                })
                .OrderBy(x => x.WalletId)
                .ThenBy(x => x.Year)
                .ThenBy(x => x.Month)
                .ToList();

            var results = new List<WalletBalanceRow>();
            long currentWalletId = 0;
            decimal running = 0m;

            foreach (var m in monthly)
            {
                if (m.WalletId != currentWalletId)
                {
                    currentWalletId = m.WalletId;
                    running = 0m;
                }

                running += m.Delta;
                results.Add(new WalletBalanceRow(m.WalletId, m.WalletName, m.Year, m.Month, running));
            }

            return results;
        }
    }
}
