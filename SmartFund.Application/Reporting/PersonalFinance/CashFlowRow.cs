namespace SmartFund.Application.Reporting.PersonalFinance
{
    public sealed record CashFlowRow(
        long WalletId,
        string WalletName,
        int Year,
        int Month,
        long CategoryId,
        string CategoryName,
        decimal Inflow,
        decimal Outflow,
        decimal Net);
}
