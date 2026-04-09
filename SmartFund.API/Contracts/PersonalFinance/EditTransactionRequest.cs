using System;

namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class EditTransactionRequest
    {
        public long CategoryId { get; set; }
        public decimal Amount { get; set; }
        public DateTime Date { get; set; }
        public string? Description { get; set; }
    }
}
