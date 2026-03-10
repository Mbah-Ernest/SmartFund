namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class RecordInvestmentContributionRequest
    {
        public long WalletId { get; set; }
        public long TrancheId { get; set; }
        public decimal Amount { get; set; }
        public string? Description { get; set; }
    }
}
