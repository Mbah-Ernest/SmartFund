using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Reporting.PersonalFinance;

namespace SmartFund.Application.Interfaces
{
    public interface IPersonalFinanceReportService
    {
        Task<List<MonthlyCategoryAmountRow>> MonthlyIncomeReportAsync(CancellationToken ct);
        Task<List<MonthlyCategoryAmountRow>> MonthlyExpenseReportAsync(CancellationToken ct);
        Task<List<CashFlowRow>> CashFlowReportAsync(CancellationToken ct);
        Task<List<WalletBalanceRow>> WalletBalanceReportAsync(CancellationToken ct);
    }
}
