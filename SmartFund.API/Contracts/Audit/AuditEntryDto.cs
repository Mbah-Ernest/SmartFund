namespace SmartFund.API.Contracts.Audit
{
    public sealed class AuditEntryDto
    {
        public long Id { get; set; }
        public int Category { get; set; }
        public string Action { get; set; } = default!;
        public string Description { get; set; } = default!;
        public long? LedgerTransactionId { get; set; }
        public long? ReversesAuditEntryId { get; set; }
        public long? ReversedByAuditEntryId { get; set; }
        public string CreatedAtUtc { get; set; } = default!;
    }
}
