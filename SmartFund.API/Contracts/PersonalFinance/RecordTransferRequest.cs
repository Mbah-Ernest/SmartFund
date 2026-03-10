using System;

namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class RecordTransferRequest
    {
        public long SourceWalletId { get; set; }
        public long DestinationWalletId { get; set; }
        public decimal Amount { get; set; }
        public string? Description { get; set; }
        public DateTime Date { get; set; }
    }
}
