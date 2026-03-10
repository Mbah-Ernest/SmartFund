namespace SmartFund.API.Contracts.Insurance;

public class UseInsuranceRequest
{
    public long TrancheId { get; set; }

    public decimal Amount { get; set; }

    public long UsedByUserId { get; set; }
}
