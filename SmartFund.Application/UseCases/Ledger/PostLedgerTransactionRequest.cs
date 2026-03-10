namespace SmartFund.API.Contracts.Ledger
{
    public sealed class PostLedgerTransactionRequest
    {
        public long PostedByUserId { get; set; } = 1; // single-operator for now
    }
}