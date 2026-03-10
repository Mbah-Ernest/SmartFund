namespace SmartFund.Application.Reporting.PersonalFinance
{
    public sealed record CategoryAmountRow(
        long CategoryId,
        string CategoryName,
        decimal Amount);
}
