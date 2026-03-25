using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Application.Services.PersonalFinance
{
    /// <summary>
    /// Detects and pairs inter-account transfers so they are excluded from P&amp;L calculations.
    /// A transfer pair is two bank imports with the same amount in kobo, opposite directions,
    /// from different connected accounts, within a configurable date window.
    /// </summary>
    public sealed class TransferDetectionService
    {
        private const int DetectionWindowDays = 2;

        private readonly IBankImportedTransactionRepository _importRepo;
        private readonly ILogger<TransferDetectionService> _logger;

        public TransferDetectionService(
            IBankImportedTransactionRepository importRepo,
            ILogger<TransferDetectionService> logger)
        {
            _importRepo = importRepo;
            _logger = logger;
        }

        /// <summary>
        /// Runs after a bank sync. For each newly imported transaction, searches other accounts
        /// for a matching opposite-side transaction and auto-pairs them when found.
        /// </summary>
        public async Task DetectAndPairAsync(IReadOnlyList<long> newImportIds, CancellationToken ct)
        {
            foreach (var importId in newImportIds)
            {
                if (ct.IsCancellationRequested) break;

                var import = await _importRepo.GetByIdAsync(importId, ct);
                if (import is null) continue;

                // Only try to pair NeedsReview items — not pending, not already paired
                if (import.Status != BankImportStatus.NeedsReview) continue;
                if (import.TransferPairImportId.HasValue) continue;

                var oppositeDirection = import.Direction == "debit" ? "credit" : "debit";

                var candidates = await _importRepo.FindPotentialPairsAsync(
                    import.ConnectedBankAccountId,
                    import.AmountKobo,
                    oppositeDirection,
                    import.TransactionDateUtc,
                    DetectionWindowDays,
                    ct);

                if (candidates.Count == 0) continue;

                // Take the closest match (first result — ordered by date desc, within the window)
                var pair = candidates[0];

                import.MarkPairedTransfer(pair.Id);
                pair.MarkPairedTransfer(import.Id);

                await _importRepo.SaveChangesAsync(ct);

                _logger.LogInformation(
                    "Auto-paired transfer: import {A} (account {AccA}) ↔ import {B} (account {AccB}), amount {Kobo} kobo",
                    import.Id, import.ConnectedBankAccountId, pair.Id, pair.ConnectedBankAccountId, import.AmountKobo);
            }
        }

        /// <summary>Manually pairs two imports as a transfer. Both must be from different accounts with the same amount.</summary>
        public async Task ManuallyPairAsync(long importIdA, long importIdB, CancellationToken ct)
        {
            if (importIdA == importIdB)
                throw new DomainException("Cannot pair a transaction with itself.");

            var a = await _importRepo.GetByIdAsync(importIdA, ct)
                ?? throw new DomainException($"Import {importIdA} not found.");
            var b = await _importRepo.GetByIdAsync(importIdB, ct)
                ?? throw new DomainException($"Import {importIdB} not found.");

            if (a.ConnectedBankAccountId == b.ConnectedBankAccountId)
                throw new DomainException("Both transactions are from the same account. Transfers must be between different accounts.");

            if (a.AmountKobo != b.AmountKobo)
                throw new DomainException($"Amounts do not match ({a.AmountKobo} vs {b.AmountKobo} kobo). Only exact-amount transfers can be paired.");

            if (a.Direction == b.Direction)
                throw new DomainException("Both transactions have the same direction. A transfer must have one debit and one credit.");

            a.MarkPairedTransfer(b.Id);
            b.MarkPairedTransfer(a.Id);

            await _importRepo.SaveChangesAsync(ct);

            _logger.LogInformation("Manually paired transfer: import {A} ↔ import {B}", importIdA, importIdB);
        }

        /// <summary>Removes the pairing, returning both sides to NeedsReview for manual categorization.</summary>
        public async Task UnpairAsync(long importId, CancellationToken ct)
        {
            var import = await _importRepo.GetByIdAsync(importId, ct)
                ?? throw new DomainException($"Import {importId} not found.");

            if (import.Status != BankImportStatus.PairedTransfer)
                throw new DomainException("This transaction is not currently paired as a transfer.");

            var pairId = import.TransferPairImportId
                ?? throw new DomainException("TransferPairImportId is missing — data inconsistency.");

            var pair = await _importRepo.GetByIdAsync(pairId, ct);

            import.UnmarkPairedTransfer();

            if (pair is not null && pair.Status == BankImportStatus.PairedTransfer)
                pair.UnmarkPairedTransfer();

            await _importRepo.SaveChangesAsync(ct);

            _logger.LogInformation("Unpaired transfer: import {A} ↔ import {B}", importId, pairId);
        }
    }
}
