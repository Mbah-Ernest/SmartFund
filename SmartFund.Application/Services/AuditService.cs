using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Application.Services
{
    public sealed class AuditService : IAuditService
    {
        private const string ReversalPin = "1072";

        private readonly IAuditRepository _auditRepo;
        private readonly ILedgerTransactionRepository _ledgerTxRepo;
        private readonly ILedgerSequenceGenerator _sequence;

        public AuditService(
            IAuditRepository auditRepo,
            ILedgerTransactionRepository ledgerTxRepo,
            ILedgerSequenceGenerator sequence)
        {
            _auditRepo = auditRepo;
            _ledgerTxRepo = ledgerTxRepo;
            _sequence = sequence;
        }

        public Task<List<AuditEntry>> ListAsync(AuditCategory category, CancellationToken ct)
            => _auditRepo.ListByCategoryAsync(category, ct);

        public async Task RecordAsync(
            AuditCategory category,
            string action,
            string description,
            long? ledgerTransactionId,
            CancellationToken ct)
        {
            var entry = AuditEntry.Create(category, action, description, ledgerTransactionId, DateTime.UtcNow);
            await _auditRepo.AddAsync(entry, ct);
            await _auditRepo.SaveChangesAsync(ct);
        }

        public async Task<long> ReverseAsync(long auditEntryId, string pin, CancellationToken ct)
        {
            if (pin != ReversalPin)
                throw new DomainException("Invalid reversal PIN.");

            var original = await _auditRepo.GetByIdAsync(auditEntryId, ct);
            if (original is null)
                throw new DomainException("Audit entry not found.");

            if (original.ReversedByAuditEntryId.HasValue)
                throw new DomainException("This action has already been reversed.");

            if (original.ReversesAuditEntryId.HasValue)
                throw new DomainException("Cannot reverse a reversal entry.");

            var utcNow = DateTime.UtcNow;
            long? reversalLedgerTxId = null;

            // If the original action has a ledger transaction, create a reversal transaction.
            if (original.LedgerTransactionId.HasValue)
            {
                var ledgerTx = await _ledgerTxRepo.GetAsync(original.LedgerTransactionId.Value, ct);
                if (ledgerTx is not null && ledgerTx.Status == TransactionStatus.Posted)
                {
                    var seq = await _sequence.NextAsync(utcNow, ct);
                    var reversalTx = ledgerTx.CreateReversal(
                        utcNow,
                        postedByUserId: ledgerTx.PostedByUserId ?? 1,
                        seq,
                        $"Reversal of audit entry #{auditEntryId}");

                    await _ledgerTxRepo.AddAsync(reversalTx, ct);
                    await _ledgerTxRepo.SaveChangesAsync(ct);
                    reversalLedgerTxId = reversalTx.Id;
                }
            }

            var reversalEntry = AuditEntry.CreateReversal(original, reversalLedgerTxId, utcNow);
            await _auditRepo.AddAsync(reversalEntry, ct);
            await _auditRepo.SaveChangesAsync(ct);

            original.MarkReversedBy(reversalEntry.Id);
            await _auditRepo.SaveChangesAsync(ct);

            return reversalEntry.Id;
        }
    }
}
