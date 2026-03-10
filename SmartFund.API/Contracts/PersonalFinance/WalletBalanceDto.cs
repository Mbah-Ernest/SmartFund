namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class WalletBalanceDto
    {
        public long WalletId { get; set; }
        public decimal Balance { get; set; }
    }
}
