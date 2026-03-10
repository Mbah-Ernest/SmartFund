namespace SmartFund.API.Contracts.Tranches;

public class PayTrancheInvestorRequest
{
    public decimal Amount { get; set; }

    public long BankAccountId { get; set; }
}
