using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Application.Services.PersonalFinance
{
    public sealed class BankStatementUploadService
    {
        private readonly IBankStatementParserService _parser;
        private readonly IBankStatementUploadRepository _uploadRepo;
        private readonly IConnectedBankAccountRepository _bankAccountRepo;
        private readonly IBankImportedTransactionRepository _importRepo;
        private readonly IPersonalWalletRepository _walletRepo;
        private readonly IPersonalTransactionRepository _txRepo;
        private readonly IPersonalCategoryRepository _categoryRepo;
        private readonly SmallChargeDetectionService _smallChargeDetection;
        private readonly AiInsightsService _insightsService;
        private readonly ILedgerTransactionRepository _ledgerRepo;
        private readonly ILedgerSequenceGenerator _seqGen;
        private readonly ILedgerAccountRepository _ledgerAccountRepo;
        private readonly IPersonalWalletService _walletService;
        private readonly ILogger<BankStatementUploadService> _logger;

        public BankStatementUploadService(
            IBankStatementParserService parser,
            IBankStatementUploadRepository uploadRepo,
            IConnectedBankAccountRepository bankAccountRepo,
            IBankImportedTransactionRepository importRepo,
            IPersonalWalletRepository walletRepo,
            IPersonalTransactionRepository txRepo,
            IPersonalCategoryRepository categoryRepo,
            SmallChargeDetectionService smallChargeDetection,
            AiInsightsService insightsService,
            ILedgerTransactionRepository ledgerRepo,
            ILedgerSequenceGenerator seqGen,
            ILedgerAccountRepository ledgerAccountRepo,
            IPersonalWalletService walletService,
            ILogger<BankStatementUploadService> logger)
        {
            _parser = parser;
            _uploadRepo = uploadRepo;
            _bankAccountRepo = bankAccountRepo;
            _importRepo = importRepo;
            _walletRepo = walletRepo;
            _txRepo = txRepo;
            _categoryRepo = categoryRepo;
            _smallChargeDetection = smallChargeDetection;
            _insightsService = insightsService;
            _ledgerRepo = ledgerRepo;
            _seqGen = seqGen;
            _ledgerAccountRepo = ledgerAccountRepo;
            _walletService = walletService;
            _logger = logger;
        }

        public async Task<long> CreateUploadJobAsync(long userId, string fileName, string fileType, CancellationToken ct)
        {
            var upload = BankStatementUpload.Create(userId, fileName, fileType, DateTime.UtcNow);
            await _uploadRepo.AddAsync(upload, ct);
            await _uploadRepo.SaveChangesAsync(ct);
            return upload.Id;
        }

        public async Task ProcessAsync(long uploadId, long userId, Stream fileStream, CancellationToken ct)
        {
            var upload = await _uploadRepo.GetByIdAsync(uploadId, ct);
            if (upload is null)
            {
                _logger.LogWarning("Upload job {UploadId} not found", uploadId);
                return;
            }

            try
            {
                var result = await _parser.ParseAsync(fileStream, upload.FileType, ct);

                if (!result.Success || result.Transactions.Count == 0)
                {
                    upload.MarkFailed(result.ErrorMessage ?? "No transactions parsed.", DateTime.UtcNow);
                    await _uploadRepo.SaveChangesAsync(ct);
                    return;
                }

                // Get or create a sentinel ConnectedBankAccount for statement uploads
                var sentinelMonoId = $"STATEMENT_UPLOAD_{userId}";
                var sentinelAccount = await _bankAccountRepo.GetByMonoAccountIdAsync(sentinelMonoId, ct);
                if (sentinelAccount is null)
                {
                    sentinelAccount = ConnectedBankAccount.Create(
                        userId, sentinelMonoId,
                        "Statement Upload", "N/A", "Statement Upload", "savings",
                        "NGN", 0, DateTime.UtcNow);
                    await _bankAccountRepo.AddAsync(sentinelAccount, ct);
                    await _bankAccountRepo.SaveChangesAsync(ct);
                }

                int flaggedCount = 0;
                int smallChargesCount = 0;

                foreach (var parsed in result.Transactions)
                {
                    var amountKobo = (long)(((parsed.Debit ?? parsed.Credit ?? 0)) * 100);
                    if (amountKobo <= 0) continue;

                    var direction = parsed.Debit.HasValue ? "debit" : "credit";
                    var narration = string.IsNullOrWhiteSpace(parsed.Description) ? "Statement Transaction" : parsed.Description;
                    var hash = ComputeHash($"{sentinelAccount.Id}|{parsed.Date:yyyy-MM-dd}|{amountKobo}|{narration}");

                    var existing = await _importRepo.GetByHashAsync(hash, ct);
                    if (existing is not null) continue;

                    var importTx = BankImportedTransaction.Create(
                        sentinelAccount.Id,
                        $"STMT_{hash[..16]}",
                        hash,
                        amountKobo,
                        direction,
                        narration,
                        narration.ToUpperInvariant(),
                        null,
                        DateTime.SpecifyKind(parsed.Date.Date, DateTimeKind.Utc),
                        DateTime.UtcNow,
                        false, false, null);

                    if (parsed.LowConfidence)
                        flaggedCount++;

                    await _importRepo.AddAsync(importTx, ct);
                }

                await _importRepo.SaveChangesAsync(ct);

                var rangeStart = result.Transactions.Min(t => t.Date);
                var rangeEnd = result.Transactions.Max(t => t.Date);

                upload.MarkComplete(
                    result.Transactions.Count,
                    result.Transactions.Count,
                    flaggedCount,
                    smallChargesCount,
                    rangeStart, rangeEnd,
                    DateTime.UtcNow);

                await _uploadRepo.SaveChangesAsync(ct);

                // Trigger insights refresh
                try
                {
                    await _insightsService.GetOrGenerateInsightsAsync(userId, forceRefresh: true, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Insights refresh failed after statement upload for user {UserId}", userId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Statement upload processing failed for upload {UploadId}", uploadId);
                if (upload is not null)
                {
                    upload.MarkFailed(ex.Message, DateTime.UtcNow);
                    await _uploadRepo.SaveChangesAsync(ct);
                }
            }
        }

        private static string ComputeHash(string input)
        {
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(bytes).ToLowerInvariant();
        }
    }
}
