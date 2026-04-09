using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Application.Interfaces
{
    public sealed record UserCreditInsights(
        long UserId,
        string FullName,
        string Email,
        int AccountTenureDays,
        decimal AvgMonthlyIncomeNaira,
        decimal AvgMonthlyExpensesNaira,
        decimal IncomeToExpenseRatio,
        int ConnectedBankAccountsCount,
        decimal BudgetComplianceRate,
        decimal GoalOnTrackRate,
        decimal IncomeStabilityScore,
        decimal AvgMonthlyTransactionCount,
        int TotalLoanApplications,
        string? MostRecentLoanStatus
    );

    public interface IUserCreditInsightsService
    {
        Task<UserCreditInsights> GetInsightsAsync(long userId, CancellationToken ct);
    }
}
