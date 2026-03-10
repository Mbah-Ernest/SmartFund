namespace SmartFund.API.Contracts.Tranches;

public class FundTrancheRequest
{
    public decimal Amount { get; set; }

    public long BankAccountId { get; set; }
}