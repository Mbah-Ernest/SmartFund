using System;

namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class PersonalTransactionDto
    {
        public long Id { get; set; }
        public long WalletId { get; set; }
        public decimal Amount { get; set; }
        public long? CategoryId { get; set; }
        public string Wallet { get; set; } = default!;
        public string Category { get; set; } = default!;
        public string Type { get; set; } = default!;
        public string Source { get; set; } = default!;
        public DateTime Date { get; set; }
        public string? Description { get; set; }

        /// <summary>Set when this transaction was created by categorizing a bank import.</summary>
        public long? SourceConnectedBankAccountId { get; set; }
        public long? SourceBankImportedTransactionId { get; set; }

        /// <summary>Human-readable bank label, e.g. "GTBank ••••1234". Null for manual transactions.</summary>
        public string? SourceBankLabel { get; set; }
    }
}
