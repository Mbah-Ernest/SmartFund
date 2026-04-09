using System;

namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class PersonalWalletDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public long LedgerAccountId { get; set; }
        public DateTime CreatedAt { get; set; }
        public decimal OpeningBalance { get; set; }
        public DateTime? OpeningBalanceDate { get; set; }
    }
}
