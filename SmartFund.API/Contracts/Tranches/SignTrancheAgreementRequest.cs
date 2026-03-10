namespace SmartFund.API.Contracts.Tranches;

public class SignTrancheAgreementRequest
{
    public string SignedName { get; set; } = default!;

    public string DocumentUrl { get; set; } = default!;
}
