using System.Collections.Generic;

namespace SmartFund.API.Contracts.Ledger
{
    public sealed class CreateLedgerTransactionRequest
    {
        public string Narration { get; set; } = "N/A";
        public List<LedgerEntryRequest> Entries { get; set; } = new();
    }

    public sealed class LedgerEntryRequest
    {
        public long AccountId { get; set; }
        public decimal Debit { get; set; }   // either >0
        public decimal Credit { get; set; }  // or >0
    }
}