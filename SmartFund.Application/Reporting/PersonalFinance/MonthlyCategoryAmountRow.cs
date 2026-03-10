namespace SmartFund.Application.Reporting.PersonalFinance
{
    public sealed record MonthlyCategoryAmountRow(
        long WalletId,
        string WalletName,
        int Year,
        int Month,
        long CategoryId,
        string CategoryName,
        decimal Amount);
}
