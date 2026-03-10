using SmartFund.Domain.Enums;

namespace SmartFund.API.Contracts.Insurance;

public class FundInsuranceRequest
{
    public InsuranceWalletType WalletType { get; set; } = InsuranceWalletType.Global;

    public long? DealId { get; set; }

    public decimal Amount { get; set; }

    public long BankAccountId { get; set; }

    public long ReceivedByUserId { get; set; }
}
