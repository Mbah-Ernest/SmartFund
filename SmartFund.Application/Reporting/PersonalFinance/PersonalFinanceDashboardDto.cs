using System.Collections.Generic;

namespace SmartFund.Application.Reporting.PersonalFinance
{
    public sealed record PersonalFinanceDashboardDto(
        decimal TotalBalance,
        decimal MonthlyIncome,
        decimal MonthlyExpenses,
        List<CategoryAmountRow> TopExpenseCategories,
        decimal InvestmentContributions);
}
