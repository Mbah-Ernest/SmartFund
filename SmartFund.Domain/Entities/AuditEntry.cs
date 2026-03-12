using System;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Entities
{
    public sealed class AuditEntry
    {
        public long Id { get; private set; }

        public AuditCategory Category { get; private set; }
        public string Action { get; private set; } = default!;
        public string Description { get; private set; } = default!;

        /// <summary>Optional reference to the ledger transaction that this action produced.</summary>
        public long? LedgerTransactionId { get; private set; }

        /// <summary>When non-null, this entry is itself a reversal of the pointed-to audit entry.</summary>
        public long? ReversesAuditEntryId { get; private set; }

        /// <summary>When non-null, this entry has been reversed by the pointed-to audit entry.</summary>
        public long? ReversedByAuditEntryId { get; private set; }

        public DateTime CreatedAtUtc { get; private set; }

        private AuditEntry() { } // EF

        public static AuditEntry Create(
            AuditCategory category,
            string action,
            string description,
            long? ledgerTransactionId,
            DateTime utcNow)
        {
            if (string.IsNullOrWhiteSpace(action))
                throw new DomainException("Audit action is required.");
            if (string.IsNullOrWhiteSpace(description))
                throw new DomainException("Audit description is required.");

            return new AuditEntry
            {
                Category = category,
                Action = action.Trim(),
                Description = description.Trim(),
                LedgerTransactionId = ledgerTransactionId,
                CreatedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc)
            };
        }

        public void MarkReversedBy(long reversalAuditEntryId)
        {
            if (ReversedByAuditEntryId.HasValue)
                throw new DomainException("This action has already been reversed.");

            ReversedByAuditEntryId = reversalAuditEntryId;
        }

        public static AuditEntry CreateReversal(
            AuditEntry original,
            long? reversalLedgerTransactionId,
            DateTime utcNow)
        {
            if (original.ReversedByAuditEntryId.HasValue)
                throw new DomainException("This action has already been reversed.");

            return new AuditEntry
            {
                Category = original.Category,
                Action = $"Reversal: {original.Action}",
                Description = $"Reversed — {original.Description}",
                LedgerTransactionId = reversalLedgerTransactionId,
                ReversesAuditEntryId = original.Id,
                CreatedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc)
            };
        }
    }
}
