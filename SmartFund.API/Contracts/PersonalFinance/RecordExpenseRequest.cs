using System;

namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class RecordExpenseRequest
    {
        public long WalletId { get; set; }
        public long CategoryId { get; set; }
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public DateTime Date { get; set; }
    }
}
