using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Application.Services.PersonalFinance
{
    public sealed class BankInboxService
    {
        private readonly IBankImportedTransactionRepository _importRepo;
        private readonly IBankCategorizationRuleRepository _ruleRepo;
        private readonly IPersonalTransactionService _txService;
        private readonly IPersonalTransactionRepository _personalTxRepo;
        private readonly IPersonalWalletRepository _walletRepo;
        private readonly IConnectedBankAccountRepository _bankAccountRepo;

        public BankInboxService(
            IBankImportedTransactionRepository importRepo,
            IBankCategorizationRuleRepository ruleRepo,
            IPersonalTransactionService txService,
            IPersonalTransactionRepository personalTxRepo,
            IPersonalWalletRepository walletRepo,
            IConnectedBankAccountRepository bankAccountRepo)
        {
            _importRepo = importRepo;
            _ruleRepo = ruleRepo;
            _txService = txService;
            _personalTxRepo = personalTxRepo;
            _walletRepo = walletRepo;
            _bankAccountRepo = bankAccountRepo;
        }

        /// <summary>
        /// Posts a staged import to the ledger after user review.
        /// If createRule is true, also persists a new categorization rule.
        /// </summary>
        public async Task<long> CategorizeAsync(
            long userId,
            long importId,
            long walletId,
            long categoryId,
            PersonalTransactionType transactionType,
            string? description,
            bool createRule,
            string? ruleMatchText,
            CancellationToken ct)
        {
            var import = await _importRepo.GetByIdAsync(importId, ct)
                ?? throw new DomainException("Bank import not found.");

            await EnsureImportBelongsToUserAsync(import, userId, ct);

            if (import.Status != BankImportStatus.NeedsReview)
                throw new DomainException("This transaction has already been reviewed.");

            EnsureDirectionMatchesType(import.Direction, transactionType);

            var amountNaira = import.AmountKobo / 100m;
            var resolvedDescription = string.IsNullOrWhiteSpace(description)
                ? import.NormalizedNarration ?? import.RawNarration
                : description.Trim();

            long ledgerTxId = transactionType switch
            {
                PersonalTransactionType.Income =>
                    await _txService.RecordIncomeAsync(userId, walletId, categoryId, amountNaira, resolvedDescription, import.TransactionDateUtc, ct),
                PersonalTransactionType.Expense =>
                    await _txService.RecordExpenseAsync(userId, walletId, categoryId, amountNaira, resolvedDescription, import.TransactionDateUtc, ct),
                _ => throw new DomainException("Only Income or Expense can be applied to bank inbox items directly.")
            };

            var personalTx = await FindPersonalTransactionByLedgerIdAsync(ledgerTxId, ct);
            if (personalTx is not null)
            {
                import.MarkPosted(personalTx.Id);
                personalTx.AttachProvenance(import.ConnectedBankAccountId, import.Id);
                await _personalTxRepo.SaveChangesAsync(ct);
            }

            await _importRepo.SaveChangesAsync(ct);

            if (createRule && !string.IsNullOrWhiteSpace(ruleMatchText))
            {
                var rule = BankCategorizationRule.Create(
                    userId,
                    ruleMatchText.Trim(),
                    isRegex: false,
                    caseSensitive: false,
                    categoryId: categoryId,
                    transactionType: transactionType,
                    priority: 100,
                    description: null,
                    autoPostCredits: transactionType == PersonalTransactionType.Income,
                    utcNow: DateTime.UtcNow);

                await _ruleRepo.AddAsync(rule, ct);
                await _ruleRepo.SaveChangesAsync(ct);
            }

            return ledgerTxId;
        }

        /// <summary>Called by the sync pipeline when a rule matches — no user interaction required.</summary>
        public async Task AutoPostAsync(
            long userId,
            BankImportedTransaction import,
            BankCategorizationRule rule,
            CancellationToken ct)
        {
            if (!DirectionMatchesType(import.Direction, rule.TransactionType))
                return;

            var walletId = await GetBankWalletIdAsync(import.ConnectedBankAccountId, ct);
            if (walletId <= 0) return; // No wallet configured; leave as NeedsReview

            var amountNaira = import.AmountKobo / 100m;
            var description = import.NormalizedNarration ?? import.RawNarration;

            long ledgerTxId = rule.TransactionType switch
            {
                PersonalTransactionType.Income =>
                    await _txService.RecordIncomeAsync(userId, walletId, rule.CategoryId, amountNaira, description, import.TransactionDateUtc, ct),
                PersonalTransactionType.Expense =>
                    await _txService.RecordExpenseAsync(userId, walletId, rule.CategoryId, amountNaira, description, import.TransactionDateUtc, ct),
                _ => 0
            };

            if (ledgerTxId <= 0) return;

            var personalTx = await FindPersonalTransactionByLedgerIdAsync(ledgerTxId, ct);
            if (personalTx is not null)
            {
                import.MarkAutoPosted(personalTx.Id);
                personalTx.AttachProvenance(import.ConnectedBankAccountId, import.Id);
                await _personalTxRepo.SaveChangesAsync(ct);
            }

            await _importRepo.SaveChangesAsync(ct);
        }

        public async Task ExcludeAsync(long userId, long importId, string? note, CancellationToken ct)
        {
            var import = await _importRepo.GetByIdAsync(importId, ct)
                ?? throw new DomainException("Bank import not found.");

            await EnsureImportBelongsToUserAsync(import, userId, ct);

            if (import.Status != BankImportStatus.NeedsReview)
                throw new DomainException("Only NeedsReview items can be excluded.");

            import.MarkExcluded(note);
            await _importRepo.SaveChangesAsync(ct);
        }

        /// <summary>Bulk categorize: apply the same category to a list of inbox items.</summary>
        public async Task<int> BulkCategorizeAsync(
            long userId,
            IReadOnlyList<long> importIds,
            long walletId,
            long categoryId,
            PersonalTransactionType transactionType,
            CancellationToken ct)
        {
            int posted = 0;
            foreach (var id in importIds)
            {
                try
                {
                    await CategorizeAsync(userId, id, walletId, categoryId, transactionType,
                        null, createRule: false, ruleMatchText: null, ct);
                    posted++;
                }
                catch (DomainException)
                {
                    // Skip already-reviewed items silently
                }
            }
            return posted;
        }

        private async Task<PersonalTransaction?> FindPersonalTransactionByLedgerIdAsync(long ledgerTxId, CancellationToken ct)
        {
            var all = await _personalTxRepo.ListAllAsync(ct);
            return all.FirstOrDefault(t => t.LedgerTransactionId == ledgerTxId);
        }

        private async Task EnsureImportBelongsToUserAsync(BankImportedTransaction import, long userId, CancellationToken ct)
        {
            var account = await _bankAccountRepo.GetByIdForUserAsync(import.ConnectedBankAccountId, userId, ct);
            if (account is null)
                throw new DomainException("Bank import not found.");
        }

        /// <summary>Returns the linked bank wallet, falling back to the first available wallet.</summary>
        private async Task<long> GetBankWalletIdAsync(long connectedBankAccountId, CancellationToken ct)
        {
            var account = await _bankAccountRepo.GetByIdAsync(connectedBankAccountId, ct);
            if (account?.PersonalWalletId > 0)
                return account.PersonalWalletId!.Value;

            // Fallback: first wallet in the system
            var wallets = await _walletRepo.ListAsync(ct);
            return wallets.Count > 0 ? wallets[0].Id : 0;
        }

        private static void EnsureDirectionMatchesType(string direction, PersonalTransactionType type)
        {
            if (!DirectionMatchesType(direction, type))
            {
                var normalized = (direction ?? string.Empty).Trim().ToLowerInvariant();
                if (normalized == "credit")
                    throw new DomainException("Credit bank transactions can only be categorized as Income.");
                if (normalized == "debit")
                    throw new DomainException("Debit bank transactions can only be categorized as Expense.");

                throw new DomainException("Unknown bank transaction direction. Please review this transaction.");
            }
        }

        private static bool DirectionMatchesType(string direction, PersonalTransactionType type)
        {
            var normalized = (direction ?? string.Empty).Trim().ToLowerInvariant();
            if (normalized == "credit")
                return type == PersonalTransactionType.Income;
            if (normalized == "debit")
                return type == PersonalTransactionType.Expense;

            return false;
        }
    }
}
