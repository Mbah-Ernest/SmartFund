using System.Collections.Generic;

namespace SmartFund.Application.Reporting.PersonalFinance
{
    public sealed record PersonalFinanceDashboardDto(
        decimal TotalBalance,
        decimal WalletBalance,
        decimal ConnectedBankBalance,
        decimal MonthlyIncome,
        decimal MonthlyExpenses,
        List<CategoryAmountRow> TopExpenseCategories,
        decimal InvestmentContributions);
}
