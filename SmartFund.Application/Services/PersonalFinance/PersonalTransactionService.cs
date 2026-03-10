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
        private const string PersonalIncomeAccountName = "Personal Finance Income";
        private const string PersonalExpenseAccountName = "Personal Finance Expenses";

        private readonly IPersonalWalletRepository _walletRepo;
        private readonly IPersonalCategoryRepository _categoryRepo;
        private readonly IPersonalTransactionRepository _personalTxRepo;
        private readonly ILedgerAccountRepository _accountRepo;
        private readonly ILedgerTransactionRepository _ledgerTxRepo;
        private readonly IPersonalBudgetRepository _budgetRepo;
        private readonly IPersonalBudgetTrackingRepository _budgetTrackingRepo;

        public PersonalTransactionService(
            IPersonalWalletRepository walletRepo,
            IPersonalCategoryRepository categoryRepo,
            IPersonalTransactionRepository personalTxRepo,
            IPersonalBudgetRepository budgetRepo,
            IPersonalBudgetTrackingRepository budgetTrackingRepo,
            ILedgerAccountRepository accountRepo,
            ILedgerTransactionRepository ledgerTxRepo)
        {
            _walletRepo = walletRepo;
            _categoryRepo = categoryRepo;
            _personalTxRepo = personalTxRepo;
            _budgetRepo = budgetRepo;
            _budgetTrackingRepo = budgetTrackingRepo;
            _accountRepo = accountRepo;
            _ledgerTxRepo = ledgerTxRepo;
        }

        public async Task<long> RecordIncomeAsync(
            long walletId,
            long categoryId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct)
        {
            if (walletId <= 0) throw new DomainException("WalletId must be valid.");
            if (categoryId <= 0) throw new DomainException("CategoryId must be valid.");
            if (amount <= 0) throw new DomainException("Amount must be greater than zero.");

            var wallet = await _walletRepo.GetByIdAsync(walletId, ct);
            if (wallet is null) throw new DomainException("Wallet not found.");

            var category = await _categoryRepo.GetByIdAsync(categoryId, ct);
            if (category is null) throw new DomainException("Category not found.");
            if (category.Type != PersonalCategoryType.Income)
                throw new DomainException("Category must be an Income category.");

            var incomeAccountId = await GetOrCreatePersonalAccountAsync(AccountType.Revenue, PersonalIncomeAccountName, ct);

            var narration = string.IsNullOrWhiteSpace(description)
                ? $"Personal income ({category.Name})"
                : $"Personal income ({category.Name}): {description.Trim()}";

            var ledgerTx = LedgerTransaction.CreateDraft(narration, ReferenceType.Personal, walletId);
            ledgerTx.AddDebit(wallet.LedgerAccountId, Money.NGN(amount));
            ledgerTx.AddCredit(incomeAccountId, Money.NGN(amount));

            await _ledgerTxRepo.AddAsync(ledgerTx, ct);
            await _ledgerTxRepo.SaveChangesAsync(ct);

            var personalTx = PersonalTransaction.Create(
                walletId,
                categoryId,
                amount,
                PersonalTransactionType.Income,
                date,
                description);

            personalTx.AttachLedgerTransaction(ledgerTx.Id);

            await _personalTxRepo.AddAsync(personalTx, ct);
            await _personalTxRepo.SaveChangesAsync(ct);

            return ledgerTx.Id;
        }

        public async Task<long> RecordExpenseAsync(
            long walletId,
            long categoryId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct)
        {
            if (walletId <= 0) throw new DomainException("WalletId must be valid.");
            if (categoryId <= 0) throw new DomainException("CategoryId must be valid.");
            if (amount <= 0) throw new DomainException("Amount must be greater than zero.");

            var wallet = await _walletRepo.GetByIdAsync(walletId, ct);
            if (wallet is null) throw new DomainException("Wallet not found.");

            var category = await _categoryRepo.GetByIdAsync(categoryId, ct);
            if (category is null) throw new DomainException("Category not found.");
            if (category.Type != PersonalCategoryType.Expense)
                throw new DomainException("Category must be an Expense category.");

            var expenseAccountId = await GetOrCreatePersonalAccountAsync(AccountType.Expense, PersonalExpenseAccountName, ct);

            string? budgetWarning = null;
            var budget = await _budgetRepo.GetByCategoryAsync(categoryId, BudgetPeriod.Monthly, ct);

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
                walletId,
                categoryId,
                amount,
                PersonalTransactionType.Expense,
                date,
                description);

            personalTx.AttachLedgerTransaction(ledgerTx.Id);

            await _personalTxRepo.AddAsync(personalTx, ct);
            await _personalTxRepo.SaveChangesAsync(ct);

            return ledgerTx.Id;
        }

        public async Task<long> RecordTransferAsync(
            long sourceWalletId,
            long destinationWalletId,
            decimal amount,
            string? description,
            DateTime date,
            CancellationToken ct)
        {
            if (sourceWalletId <= 0) throw new DomainException("SourceWalletId must be valid.");
            if (destinationWalletId <= 0) throw new DomainException("DestinationWalletId must be valid.");
            if (sourceWalletId == destinationWalletId) throw new DomainException("Source and destination wallets must be different.");
            if (amount <= 0) throw new DomainException("Amount must be greater than zero.");

            var sourceWallet = await _walletRepo.GetByIdAsync(sourceWalletId, ct);
            if (sourceWallet is null) throw new DomainException("Source wallet not found.");

            var destinationWallet = await _walletRepo.GetByIdAsync(destinationWalletId, ct);
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
                sourceWalletId,
                null,
                amount,
                PersonalTransactionType.Transfer,
                date,
                string.IsNullOrWhiteSpace(description) ? $"Transfer to {destinationWallet.Name}" : description);

            sourcePersonalTx.AttachLedgerTransaction(ledgerTx.Id);

            var destinationPersonalTx = PersonalTransaction.Create(
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

            return ledgerTx.Id;
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
