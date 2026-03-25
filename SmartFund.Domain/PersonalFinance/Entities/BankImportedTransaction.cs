using System;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class BankImportedTransaction
    {
        public long Id { get; private set; }

        public long ConnectedBankAccountId { get; private set; }

        /// <summary>Mono's native transaction _id. Primary dedup key.</summary>
        public string MonoTransactionId { get; private set; } = default!;

        /// <summary>SHA-256 hash of (accountId|date|amountKobo|narration) — fallback dedup key.</summary>
        public string IdempotencyHash { get; private set; } = default!;

        /// <summary>Raw amount in kobo as returned by Mono (smallest currency unit).</summary>
        public long AmountKobo { get; private set; }

        /// <summary>"credit" or "debit" as returned by Mono.</summary>
        public string Direction { get; private set; } = default!;

        /// <summary>Narration exactly as returned by the bank / Mono.</summary>
        public string RawNarration { get; private set; } = default!;

        /// <summary>Uppercased, noise-stripped version of RawNarration used for rule matching.</summary>
        public string? NormalizedNarration { get; private set; }

        /// <summary>Heuristic-extracted merchant / counterparty name.</summary>
        public string? ExtractedMerchant { get; private set; }

        public DateTime TransactionDateUtc { get; private set; }
        public DateTime ImportedAtUtc { get; private set; }

        public BankImportStatus Status { get; private set; }

        /// <summary>True when the bank has flagged the transaction as pending/uncleared.</summary>
        public bool IsPending { get; private set; }

        /// <summary>True when this transaction is a reversal of an earlier transaction.</summary>
        public bool IsReversal { get; private set; }

        /// <summary>MonoTransactionId of the transaction this entry reverses.</summary>
        public string? ReversalOfMonoId { get; private set; }

        /// <summary>Set once the transaction has been posted to PersonalTransactions.</summary>
        public long? LinkedPersonalTransactionId { get; private set; }

        /// <summary>Links the other side of a detected transfer pair.</summary>
        public long? TransferPairImportId { get; private set; }

        public string? ReviewNote { get; private set; }
        public DateTime? ReviewedAtUtc { get; private set; }

        private BankImportedTransaction() { } // EF

        public static BankImportedTransaction Create(
            long connectedBankAccountId,
            string monoTransactionId,
            string idempotencyHash,
            long amountKobo,
            string direction,
            string rawNarration,
            string? normalizedNarration,
            string? extractedMerchant,
            DateTime transactionDateUtc,
            DateTime importedAtUtc,
            bool isPending,
            bool isReversal,
            string? reversalOfMonoId)
        {
            if (connectedBankAccountId <= 0)
                throw new DomainException("ConnectedBankAccountId must be a positive value.");
            if (string.IsNullOrWhiteSpace(monoTransactionId))
                throw new DomainException("MonoTransactionId is required.");
            if (string.IsNullOrWhiteSpace(idempotencyHash))
                throw new DomainException("IdempotencyHash is required.");
            if (amountKobo <= 0)
                throw new DomainException("AmountKobo must be greater than zero.");
            if (string.IsNullOrWhiteSpace(direction))
                throw new DomainException("Direction is required.");
            if (string.IsNullOrWhiteSpace(rawNarration))
                rawNarration = "Bank Transaction";

            return new BankImportedTransaction
            {
                ConnectedBankAccountId = connectedBankAccountId,
                MonoTransactionId = monoTransactionId.Trim(),
                IdempotencyHash = idempotencyHash.Trim(),
                AmountKobo = amountKobo,
                Direction = direction.Trim().ToLowerInvariant(),
                RawNarration = rawNarration.Trim(),
                NormalizedNarration = normalizedNarration,
                ExtractedMerchant = extractedMerchant,
                TransactionDateUtc = DateTime.SpecifyKind(transactionDateUtc.Date, DateTimeKind.Utc),
                ImportedAtUtc = DateTime.SpecifyKind(importedAtUtc, DateTimeKind.Utc),
                Status = isPending ? BankImportStatus.Pending : BankImportStatus.NeedsReview,
                IsPending = isPending,
                IsReversal = isReversal,
                ReversalOfMonoId = reversalOfMonoId?.Trim()
            };
        }

        public void MarkPosted(long personalTransactionId)
        {
            if (personalTransactionId <= 0)
                throw new DomainException("PersonalTransactionId must be a positive value.");
            LinkedPersonalTransactionId = personalTransactionId;
            Status = BankImportStatus.ManuallyPosted;
            ReviewedAtUtc = DateTime.UtcNow;
        }

        public void MarkAutoPosted(long personalTransactionId)
        {
            if (personalTransactionId <= 0)
                throw new DomainException("PersonalTransactionId must be a positive value.");
            LinkedPersonalTransactionId = personalTransactionId;
            Status = BankImportStatus.AutoPosted;
        }

        public void MarkExcluded(string? note)
        {
            Status = BankImportStatus.Excluded;
            ReviewNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
            ReviewedAtUtc = DateTime.UtcNow;
        }

        public void MarkReversed()
        {
            Status = BankImportStatus.Reversed;
        }

        public void MarkNeedsReview()
        {
            Status = BankImportStatus.NeedsReview;
        }

        public void MarkPendingSettled()
        {
            if (!IsPending)
                throw new DomainException("Transaction is not in pending state.");
            IsPending = false;
            Status = BankImportStatus.NeedsReview;
        }

        public void LinkTransferPair(long pairImportId)
        {
            if (pairImportId <= 0)
                throw new DomainException("PairImportId must be a positive value.");
            TransferPairImportId = pairImportId;
        }

        /// <summary>Marks this import as one side of a detected inter-account transfer. Excludes it from P&amp;L.</summary>
        public void MarkPairedTransfer(long pairImportId)
        {
            if (pairImportId <= 0)
                throw new DomainException("PairImportId must be a positive value.");
            if (Status == BankImportStatus.ManuallyPosted || Status == BankImportStatus.AutoPosted)
                throw new DomainException("Cannot pair a transaction that has already been posted to the ledger.");
            TransferPairImportId = pairImportId;
            Status = BankImportStatus.PairedTransfer;
        }

        /// <summary>Removes the transfer pairing, returning the import to NeedsReview for manual categorization.</summary>
        public void UnmarkPairedTransfer()
        {
            if (Status != BankImportStatus.PairedTransfer)
                throw new DomainException("Transaction is not in PairedTransfer state.");
            TransferPairImportId = null;
            Status = BankImportStatus.NeedsReview;
        }

        public void SetReviewNote(string note)
        {
            ReviewNote = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
        }
    }
}
