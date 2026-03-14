using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Services.PersonalFinance
{
    public sealed class BankSyncService
    {
        private readonly IConnectedBankAccountRepository _accountRepo;
        private readonly IBankImportedTransactionRepository _importRepo;
        private readonly IBankCategorizationRuleRepository _ruleRepo;
        private readonly CategorizationEngine _engine;
        private readonly BankInboxService _inboxService;
        private readonly IMonoApiClient _mono;
        private readonly ILogger<BankSyncService> _logger;

        public BankSyncService(
            IConnectedBankAccountRepository accountRepo,
            IBankImportedTransactionRepository importRepo,
            IBankCategorizationRuleRepository ruleRepo,
            CategorizationEngine engine,
            BankInboxService inboxService,
            IMonoApiClient mono,
            ILogger<BankSyncService> logger)
        {
            _accountRepo = accountRepo;
            _importRepo = importRepo;
            _ruleRepo = ruleRepo;
            _engine = engine;
            _inboxService = inboxService;
            _mono = mono;
            _logger = logger;
        }

        /// <summary>Syncs all active connected accounts. Called by the background job.</summary>
        public async Task SyncAllAsync(CancellationToken ct)
        {
            var accounts = await _accountRepo.ListAsync(ct);
            foreach (var account in accounts)
            {
                if (ct.IsCancellationRequested) break;
                try
                {
                    await SyncAccountAsync(account, ct);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Sync failed for account {AccountId} ({Bank})", account.Id, account.BankName);
                    account.MarkSyncError(ex.Message, DateTime.UtcNow);
                    await _accountRepo.SaveChangesAsync(ct);
                }
            }
        }

        /// <summary>Syncs a single account. Pulls from Mono, dedupes, classifies, and persists.</summary>
        public async Task SyncAccountAsync(ConnectedBankAccount account, CancellationToken ct)
        {
            _logger.LogInformation("Syncing account {AccountId} ({Bank})", account.Id, account.BankName);

            DateTime? since = account.TotalTransactionsSynced == 0
                ? DateTime.UtcNow.AddMonths(-3)
                : account.LastSyncedAtUtc.AddDays(-1); // 1-day overlap to catch late-posted transactions

            List<MonoTransaction> transactions;
            try
            {
                transactions = await _mono.GetTransactionsAsync(account.MonoAccountId, since, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Mono API call failed for account {AccountId}", account.Id);
                account.MarkSyncError(ex.Message, DateTime.UtcNow);
                await _accountRepo.SaveChangesAsync(ct);
                return;
            }

            var rules = await _ruleRepo.ListActiveAsync(ct);
            int newCount = 0, dedupSkipped = 0, autoPosted = 0;

            foreach (var tx in transactions)
            {
                if (ct.IsCancellationRequested) break;

                // Dedup: try Mono ID first
                var existing = await _importRepo.GetByMonoTransactionIdAsync(tx.Id, account.Id, ct);
                if (existing is not null)
                {
                    dedupSkipped++;
                    continue;
                }

                // Dedup: hash fallback
                var hash = ComputeHash(account.Id, tx.Date, tx.Amount, tx.Narration);
                var existingByHash = await _importRepo.GetByHashAsync(hash, ct);
                if (existingByHash is not null)
                {
                    dedupSkipped++;
                    continue;
                }

                var normalized = _engine.Normalize(tx.Narration);
                var merchant = _engine.ExtractMerchant(normalized);

                var import = BankImportedTransaction.Create(
                    account.Id,
                    tx.Id,
                    hash,
                    tx.Amount,
                    tx.Type,
                    tx.Narration,
                    normalized,
                    merchant,
                    tx.Date,
                    DateTime.UtcNow,
                    tx.Pending,
                    isReversal: false,
                    reversalOfMonoId: null);

                await _importRepo.AddAsync(import, ct);
                await _importRepo.SaveChangesAsync(ct);
                newCount++;

                // Try to auto-categorize if not pending
                if (!tx.Pending)
                {
                    var matchedRule = _engine.FindMatch(import, rules);
                    if (matchedRule is not null)
                    {
                        try
                        {
                            await _inboxService.AutoPostAsync(import, matchedRule, ct);
                            matchedRule.RecordMatch(DateTime.UtcNow);
                            await _ruleRepo.SaveChangesAsync(ct);
                            autoPosted++;
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Auto-post failed for import {ImportId}", import.Id);
                            // Import stays as NeedsReview — safe to continue
                        }
                    }
                }
            }

            // Update account balance from Mono
            try
            {
                var info = await _mono.GetAccountInfoAsync(account.MonoAccountId, ct);
                account.UpdateBalance(info.BalanceKobo, DateTime.UtcNow);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Balance refresh failed for account {AccountId}", account.Id);
            }

            account.MarkSyncSuccess(newCount, DateTime.UtcNow);
            await _accountRepo.SaveChangesAsync(ct);

            _logger.LogInformation(
                "Account {AccountId} sync done. New: {New}, Dupes skipped: {Dupes}, Auto-posted: {Auto}",
                account.Id, newCount, dedupSkipped, autoPosted);
        }

        private static string ComputeHash(long accountId, DateTime date, long amountKobo, string narration)
        {
            var input = $"{accountId}|{date:yyyy-MM-dd}|{amountKobo}|{narration}";
            var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexStringLower(bytes);
        }
    }
}
