using System;
using System.Collections.Generic;
using System.Linq;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.ValueObjects;

namespace SmartFund.Domain.Entities
{
    public sealed class LedgerTransaction
    {
        public long Id { get; private set; } // EF later

        public string Narration { get; private set; } = string.Empty;
        public TransactionStatus Status { get; private set; } = TransactionStatus.Draft;

        public DateTime? PostedAtUtc { get; private set; }
        public long? PostedByUserId { get; private set; }
        public string? SequenceNumber { get; private set; } // e.g. SF-20260221-000001
        public SmartFund.Domain.Enums.ReferenceType ReferenceType { get; private set; } = SmartFund.Domain.Enums.ReferenceType.None;
        public long? ReferenceId { get; private set; }
        public long? ReversesTransactionId { get; private set; }

        private readonly List<LedgerEntry> _entries = new();
        public IReadOnlyCollection<LedgerEntry> Entries => _entries.AsReadOnly();

        private LedgerTransaction() { } // EF

        private LedgerTransaction(string narration)
        {
            Narration = string.IsNullOrWhiteSpace(narration)
                ? "N/A"
                : narration.Trim();
        }

        public static LedgerTransaction CreateDraft(string narration) =>
            new LedgerTransaction(narration);

        public void AddEntry(long accountId, decimal debit, decimal credit)
        {
            EnsureDraft();

            var debitPositive = debit > 0m;
            var creditPositive = credit > 0m;

            if (debitPositive == creditPositive)
                throw new DomainException("Entry must have exactly one of Debit or Credit greater than zero.");

            if (debitPositive)
                AddDebit(accountId, Money.NGN(debit));
            else
                AddCredit(accountId, Money.NGN(credit));
        }

        public void AddDebit(long accountId, Money amount)
        {
            EnsureDraft();
            _entries.Add(LedgerEntry.CreateDebit(accountId, amount));
        }

        public void AddCredit(long accountId, Money amount)
        {
            EnsureDraft();
            _entries.Add(LedgerEntry.CreateCredit(accountId, amount));
        }

        public void Post(DateTime postedAtUtc, long postedByUserId, string sequenceNumber)
        {
            EnsureDraft();

            if (postedByUserId <= 0)
                throw new DomainException("PostedByUserId must be a positive value.");

            if (string.IsNullOrWhiteSpace(sequenceNumber))
                throw new DomainException("SequenceNumber is required.");

            if (_entries.Count < 2)
                throw new DomainException("A ledger transaction must have at least 2 entries.");

            var totalDebits = _entries.Sum(e => e.Debit.Amount);
            var totalCredits = _entries.Sum(e => e.Credit.Amount);

            if (totalDebits != totalCredits)
                throw new DomainException("Ledger transaction is unbalanced (total debits must equal total credits).");

            Status = TransactionStatus.Posted;
            PostedAtUtc = DateTime.SpecifyKind(postedAtUtc, DateTimeKind.Utc);
            PostedByUserId = postedByUserId;
            SequenceNumber = sequenceNumber.Trim();
        }

        public LedgerTransaction CreateReversal(DateTime postedAtUtc, long postedByUserId, string sequenceNumber, string narration)
        {
            if (Status != TransactionStatus.Posted)
                throw new DomainException("Only posted transactions can be reversed.");

            var reversal = new LedgerTransaction(string.IsNullOrWhiteSpace(narration) ? $"Reversal of {SequenceNumber}" : narration.Trim())
            {
                ReversesTransactionId = this.Id
            };

            foreach (var e in _entries)
            {
                if (!e.Debit.IsZero())
                    reversal.AddCredit(e.AccountId, e.Debit);
                else
                    reversal.AddDebit(e.AccountId, e.Credit);
            }

            reversal.Post(postedAtUtc, postedByUserId, sequenceNumber);
            return reversal;
        }

        public static LedgerTransaction CreateDraft(string narration, ReferenceType referenceType = ReferenceType.None, long? referenceId = null)
        {
            var tx = new LedgerTransaction(narration);
            tx.ReferenceType = referenceType;
            tx.ReferenceId = referenceId;
            return tx;
        }

        private void EnsureDraft()
        {
            if (Status != TransactionStatus.Draft)
                throw new DomainException("Only draft transactions can be modified.");
        }
    }
}