namespace SmartFund.Application.Reporting.PersonalFinance
{
    public sealed record WalletBalanceRow(
        long WalletId,
        string WalletName,
        int Year,
        int Month,
        decimal Balance);
}
