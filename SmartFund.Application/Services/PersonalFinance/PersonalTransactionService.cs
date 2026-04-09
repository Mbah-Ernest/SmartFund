using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalBudget.Entities;
using SmartFund.Domain.PersonalBudget.Enums;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.ValueObjects;

namespace SmartFund.Application.Services.PersonalFinance
{
    public sealed class PersonalTransactionService : IPersonalTransactionService
    {
        private static string PersonalIncomeAccountName(long userId) => $"Personal Finance Income [u:{userId}]";
        private static string PersonalExpenseAccountName(long userId) => $"Personal Finance Expenses [u:{userId}]";

        private readonly IPersonalWalletRepository _walletRepo;
        private readonly IPersonalCategoryRepository _categoryRepo;
        private readonly IPersonalTransactionRepository _personalTxRepo;
        private readonly ILedgerAccountRepository _accountRepo;
        private readonly ILedgerTransactionRepository _ledgerTxRepo;
        private readonly IPersonalBudgetRepository _budgetRepo;
        private readonly IPersonalBudgetTrackingRepository _budgetTrackingRepo;
        private readonly IAuditService _auditService;

        public PersonalTransactionService(
            IPersonalWalletRepository walletRepo,
            IPersonalCategoryRepository categoryRepo,
            IPersonalTransactionRepository personalTxRepo,
            IPersonalBudgetRepository budgetRepo,
            IPersonalBudgetTrackingRepository budgetTrackingRepo,
            ILedgerAccountRepository accountRepo,
            ILedgerTransactionRepository ledgerTxRepo,
            IAuditService auditService)
        {
            _walletRepo = walletRepo;
            _categoryRepo = categoryRepo;
            _personalTxRepo = personalTxRepo;
            _budgetRepo = budgetRepo;
            _budgetTrackingRepo = budgetTrackingRepo;
            _accountRepo = accountRepo;
            _ledgerTxRepo = ledgerTxRepo;
            _auditService = auditService;
        }

        public async Task<long> RecordIncomeAsync(
            long userId,
            long walletId,
            long categoryId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct)
        {
            if (userId <= 0) throw new DomainException("UserId must be valid.");
            if (walletId <= 0) throw new DomainException("WalletId must be valid.");
            if (categoryId <= 0) throw new DomainException("CategoryId must be valid.");
            if (amount <= 0) throw new DomainException("Amount must be greater than zero.");

            var wallet = await _walletRepo.GetByIdForUserAsync(walletId, userId, ct);
            if (wallet is null) throw new DomainException("Wallet not found.");

            var category = await _categoryRepo.GetByIdForUserAsync(categoryId, userId, ct);
            if (category is null) throw new DomainException("Category not found.");
            if (category.Type != PersonalCategoryType.Income)
                throw new DomainException("Category must be an Income category.");

            var incomeAccountId = await GetOrCreatePersonalAccountAsync(AccountType.Revenue, PersonalIncomeAccountName(userId), ct);

            var narration = string.IsNullOrWhiteSpace(description)
                ? $"Personal income ({category.Name})"
                : $"Personal income ({category.Name}): {description.Trim()}";

            var ledgerTx = LedgerTransaction.CreateDraft(narration, ReferenceType.Personal, walletId);
            ledgerTx.AddDebit(wallet.LedgerAccountId, Money.NGN(amount));
            ledgerTx.AddCredit(incomeAccountId, Money.NGN(amount));

            await _ledgerTxRepo.AddAsync(ledgerTx, ct);
            await _ledgerTxRepo.SaveChangesAsync(ct);

            var personalTx = PersonalTransaction.Create(
                userId,
                walletId,
                categoryId,
                amount,
                PersonalTransactionType.Income,
                date,
                description);

            personalTx.AttachLedgerTransaction(ledgerTx.Id);

            await _personalTxRepo.AddAsync(personalTx, ct);
            await _personalTxRepo.SaveChangesAsync(ct);

            var auditDescIncome = $"Recorded income of ₦{amount:N2} to wallet {wallet.Name}: {description}";
            await _auditService.RecordAsync(AuditCategory.PersonalFinance, "RecordIncome", auditDescIncome, ledgerTx.Id, ct);

            return ledgerTx.Id;
        }

        public async Task<long> RecordExpenseAsync(
            long userId,
            long walletId,
            long categoryId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct)
        {
            if (userId <= 0) throw new DomainException("UserId must be valid.");
            if (walletId <= 0) throw new DomainException("WalletId must be valid.");
            if (categoryId <= 0) throw new DomainException("CategoryId must be valid.");
            if (amount <= 0) throw new DomainException("Amount must be greater than zero.");

            var wallet = await _walletRepo.GetByIdForUserAsync(walletId, userId, ct);
            if (wallet is null) throw new DomainException("Wallet not found.");

            var category = await _categoryRepo.GetByIdForUserAsync(categoryId, userId, ct);
            if (category is null) throw new DomainException("Category not found.");
            if (category.Type != PersonalCategoryType.Expense)
                throw new DomainException("Category must be an Expense category.");

            var expenseAccountId = await GetOrCreatePersonalAccountAsync(AccountType.Expense, PersonalExpenseAccountName(userId), ct);

            string? budgetWarning = null;
            var budget = await _budgetRepo.GetByCategoryForUserAsync(userId, categoryId, BudgetPeriod.Monthly, ct);

            if (budget is not null)
            {
                var year = date.Year;
                var month = date.Month;

                var tracking = await _budgetTrackingRepo.GetAsync(budget.Id, year, month, ct);

                if (tracking is null)
                {
                    tracking = BudgetTracking.CreateForPeriod(budget.Id, year, month, budget.Amount);
                    await _budgetTrackingRepo.AddAsync(tracking, ct);
                }

                tracking.ApplyExpense(amount, budget.Amount);

                if (tracking.IsOverBudget())
                    budgetWarning = $"Budget exceeded for '{category.Name}'. Over by {Math.Abs(tracking.RemainingAmount):N2}.";
            }

            var narration = string.IsNullOrWhiteSpace(description)
                ? $"Personal expense ({category.Name})"
                : $"Personal expense ({category.Name}): {description.Trim()}";

            if (!string.IsNullOrWhiteSpace(budgetWarning))
                narration = $"[BUDGET EXCEEDED] {narration}";

            var ledgerTx = LedgerTransaction.CreateDraft(narration, ReferenceType.Personal, walletId);
            ledgerTx.AddDebit(expenseAccountId, Money.NGN(amount));
            ledgerTx.AddCredit(wallet.LedgerAccountId, Money.NGN(amount));

            await _ledgerTxRepo.AddAsync(ledgerTx, ct);
            await _ledgerTxRepo.SaveChangesAsync(ct);

            var personalTx = PersonalTransaction.Create(
                userId,
                walletId,
                categoryId,
                amount,
                PersonalTransactionType.Expense,
                date,
                description);

            personalTx.AttachLedgerTransaction(ledgerTx.Id);

            await _personalTxRepo.AddAsync(personalTx, ct);
            await _personalTxRepo.SaveChangesAsync(ct);

            var auditDescExpense = $"Recorded expense of ₦{amount:N2} from wallet {wallet.Name}: {description}";
            await _auditService.RecordAsync(AuditCategory.PersonalFinance, "RecordExpense", auditDescExpense, ledgerTx.Id, ct);

            return ledgerTx.Id;
        }

        public async Task<long> RecordTransferAsync(
            long userId,
            long sourceWalletId,
            long destinationWalletId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct)
        {
            if (userId <= 0) throw new DomainException("UserId must be valid.");
            if (sourceWalletId <= 0) throw new DomainException("SourceWalletId must be valid.");
            if (destinationWalletId <= 0) throw new DomainException("DestinationWalletId must be valid.");
            if (sourceWalletId == destinationWalletId) throw new DomainException("Source and destination wallets must be different.");
            if (amount <= 0) throw new DomainException("Amount must be greater than zero.");

            var sourceWallet = await _walletRepo.GetByIdForUserAsync(sourceWalletId, userId, ct);
            if (sourceWallet is null) throw new DomainException("Source wallet not found.");

            var destinationWallet = await _walletRepo.GetByIdForUserAsync(destinationWalletId, userId, ct);
            if (destinationWallet is null) throw new DomainException("Destination wallet not found.");

            var narration = string.IsNullOrWhiteSpace(description)
                ? $"Personal transfer: {sourceWallet.Name} -> {destinationWallet.Name}"
                : $"Personal transfer: {sourceWallet.Name} -> {destinationWallet.Name} ({description.Trim()})";

            var ledgerTx = LedgerTransaction.CreateDraft(narration, ReferenceType.Personal, sourceWalletId);
            ledgerTx.AddDebit(destinationWallet.LedgerAccountId, Money.NGN(amount));
            ledgerTx.AddCredit(sourceWallet.LedgerAccountId, Money.NGN(amount));

            await _ledgerTxRepo.AddAsync(ledgerTx, ct);
            await _ledgerTxRepo.SaveChangesAsync(ct);

            var sourcePersonalTx = PersonalTransaction.Create(
                userId,
                sourceWalletId,
                null,
                amount,
                PersonalTransactionType.Transfer,
                date,
                string.IsNullOrWhiteSpace(description) ? $"Transfer to {destinationWallet.Name}" : description);

            sourcePersonalTx.AttachLedgerTransaction(ledgerTx.Id);

            var destinationPersonalTx = PersonalTransaction.Create(
                userId,
                destinationWalletId,
                null,
                amount,
                PersonalTransactionType.Transfer,
                date,
                string.IsNullOrWhiteSpace(description) ? $"Transfer from {sourceWallet.Name}" : description);

            destinationPersonalTx.AttachLedgerTransaction(ledgerTx.Id);

            await _personalTxRepo.AddAsync(sourcePersonalTx, ct);
            await _personalTxRepo.AddAsync(destinationPersonalTx, ct);
            await _personalTxRepo.SaveChangesAsync(ct);

            var auditDescTransfer = $"Transferred ₦{amount:N2} from {sourceWallet.Name} to {destinationWallet.Name}: {description}";
            await _auditService.RecordAsync(AuditCategory.PersonalFinance, "RecordTransfer", auditDescTransfer, ledgerTx.Id, ct);

            return ledgerTx.Id;
        }

        public async Task DeleteTransactionAsync(long userId, long transactionId, CancellationToken ct)
        {
            var tx = await _personalTxRepo.GetByIdAsync(transactionId, ct);
            if (tx is null || tx.UserId != userId)
                throw new DomainException("Transaction not found.");

            if (tx.Source != TransactionSource.Manual)
                throw new DomainException("Only manually entered transactions can be deleted.");

            var type = tx.TransactionType;
            var amount = tx.Amount;
            var categoryId = tx.CategoryId;
            var date = tx.Date;
            var description = tx.Description;
            var ledgerTxId = tx.LedgerTransactionId;

            // Load all PersonalTransactions sharing this ledger (handles transfer pairs)
            var siblings = await _personalTxRepo.ListByLedgerTransactionIdAsync(ledgerTxId, ct);

            var ledgerTx = await _ledgerTxRepo.GetAsync(ledgerTxId, ct);
            if (ledgerTx is null)
                throw new DomainException("Ledger transaction not found.");

            // Rollback budget tracking for expenses
            if (type == PersonalTransactionType.Expense && categoryId.HasValue)
            {
                var budget = await _budgetRepo.GetByCategoryForUserAsync(userId, categoryId.Value, BudgetPeriod.Monthly, ct);
                if (budget is not null)
                {
                    var tracking = await _budgetTrackingRepo.GetAsync(budget.Id, date.Year, date.Month, ct);
                    if (tracking is not null)
                    {
                        tracking.ReverseExpense(amount, budget.Amount);
                        await _budgetTrackingRepo.SaveChangesAsync(ct);
                    }
                }
            }

            foreach (var sibling in siblings)
                await _personalTxRepo.RemoveAsync(sibling, ct);
            await _personalTxRepo.SaveChangesAsync(ct);

            await _ledgerTxRepo.RemoveAsync(ledgerTx, ct);
            await _ledgerTxRepo.SaveChangesAsync(ct);

            var auditDesc = $"Deleted {type} of ₦{amount:N2} on {date:dd MMM yyyy}"
                + (description is not null ? $" – {description}" : "");
            await _auditService.RecordAsync(AuditCategory.PersonalFinance, "Delete Transaction", auditDesc, null, ct);
        }

        public async Task<long> EditTransactionAsync(
            long userId,
            long transactionId,
            long categoryId,
            decimal amount,
            DateTime date,
            string? description,
            CancellationToken ct)
        {
            var tx = await _personalTxRepo.GetByIdAsync(transactionId, ct);
            if (tx is null || tx.UserId != userId)
                throw new DomainException("Transaction not found.");

            if (tx.Source != TransactionSource.Manual)
                throw new DomainException("Only manually entered transactions can be edited.");

            if (tx.TransactionType == PersonalTransactionType.Transfer)
                throw new DomainException("Transfer transactions cannot be edited. Delete and re-enter instead.");

            var oldType = tx.TransactionType;
            var oldAmount = tx.Amount;
            var oldCategoryId = tx.CategoryId;
            var oldDate = tx.Date;
            var oldDesc = tx.Description;
            var walletId = tx.WalletId;
            var ledgerTxId = tx.LedgerTransactionId;

            var ledgerTx = await _ledgerTxRepo.GetAsync(ledgerTxId, ct);
            if (ledgerTx is null)
                throw new DomainException("Ledger transaction not found.");

            // Rollback budget tracking for old expense
            if (oldType == PersonalTransactionType.Expense && oldCategoryId.HasValue)
            {
                var budget = await _budgetRepo.GetByCategoryForUserAsync(userId, oldCategoryId.Value, BudgetPeriod.Monthly, ct);
                if (budget is not null)
                {
                    var tracking = await _budgetTrackingRepo.GetAsync(budget.Id, oldDate.Year, oldDate.Month, ct);
                    if (tracking is not null)
                    {
                        tracking.ReverseExpense(oldAmount, budget.Amount);
                        await _budgetTrackingRepo.SaveChangesAsync(ct);
                    }
                }
            }

            await _personalTxRepo.RemoveAsync(tx, ct);
            await _personalTxRepo.SaveChangesAsync(ct);

            await _ledgerTxRepo.RemoveAsync(ledgerTx, ct);
            await _ledgerTxRepo.SaveChangesAsync(ct);

            long newLedgerTxId;
            if (oldType == PersonalTransactionType.Income)
                newLedgerTxId = await RecordIncomeAsync(userId, walletId, categoryId, amount, description, date, ct);
            else
                newLedgerTxId = await RecordExpenseAsync(userId, walletId, categoryId, amount, description, date, ct);

            var auditDesc = $"Edited {oldType}: amount {oldAmount:N2}→{amount:N2}, date {oldDate:dd MMM yyyy}→{date:dd MMM yyyy}, desc '{oldDesc}'→'{description}'";
            await _auditService.RecordAsync(AuditCategory.PersonalFinance, "Edit Transaction", auditDesc, newLedgerTxId, ct);

            return newLedgerTxId;
        }

        private async Task<long> GetOrCreatePersonalAccountAsync(AccountType type, string name, CancellationToken ct)
        {
            var existing = (await _accountRepo.ListAsync(ct))
                .FirstOrDefault(a => a.Type == type && a.Name == name);

            if (existing is not null)
                return existing.Id;

            var account = LedgerAccount.Create(name, type, ReferenceType.Personal);
            await _accountRepo.AddAsync(account, ct);
            await _accountRepo.SaveChangesAsync(ct);
            return account.Id;
        }
    }
}
