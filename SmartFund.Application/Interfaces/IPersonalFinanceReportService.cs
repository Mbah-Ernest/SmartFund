using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Reporting.PersonalFinance;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalFinanceReportService
    {
        Task<List<MonthlyCategoryAmountRow>> MonthlyIncomeReportAsync(long userId, CancellationToken ct);
        Task<List<MonthlyCategoryAmountRow>> MonthlyExpenseReportAsync(long userId, CancellationToken ct);
        Task<List<CashFlowRow>> CashFlowReportAsync(long userId, CancellationToken ct);
        Task<List<WalletBalanceRow>> WalletBalanceReportAsync(long userId, CancellationToken ct);
    }
}
