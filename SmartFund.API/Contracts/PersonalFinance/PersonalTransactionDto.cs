using System;

namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class PersonalTransactionDto
    {
        public long Id { get; set; }
        public decimal Amount { get; set; }
        public string Category { get; set; } = default!;
        public string Type { get; set; } = default!;
        public DateTime Date { get; set; }
        public string? Description { get; set; }
    }
}
