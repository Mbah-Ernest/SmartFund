using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Domain.ValueObjects;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class ReconcileWallet
    {
        private readonly IPersonalWalletRepository _walletRepo;
        private readonly IPersonalTransactionRepository _personalTxRepo;
        private readonly ILedgerAccountRepository _accountRepo;
        private readonly ILedgerTransactionRepository _ledgerTxRepo;

        public ReconcileWallet(
            IPersonalWalletRepository walletRepo,
            IPersonalTransactionRepository personalTxRepo,
            ILedgerAccountRepository accountRepo,
            ILedgerTransactionRepository ledgerTxRepo)
        {
            _walletRepo = walletRepo;
            _personalTxRepo = personalTxRepo;
            _accountRepo = accountRepo;
            _ledgerTxRepo = ledgerTxRepo;
        }

        public async Task<(decimal Diff, decimal NewBalance)> ExecuteAsync(
            long userId,
            long walletId,
            decimal actualBalance,
            DateTime date,
            string? note,
            CancellationToken ct)
        {
            if (userId <= 0) throw new DomainException("UserId must be valid.");
            if (walletId <= 0) throw new DomainException("WalletId must be valid.");
            if (actualBalance < 0) throw new DomainException("Actual balance cannot be negative.");

            var wallet = await _walletRepo.GetByIdForUserAsync(walletId, userId, ct);
            if (wallet is null)
                throw new DomainException("Wallet not found.");

            var ledgerBalance = await _ledgerTxRepo.GetPostedBalanceForAccountAsync(wallet.LedgerAccountId, ct);
            var currentBalance = wallet.OpeningBalance + ledgerBalance;

            var diff = actualBalance - currentBalance;

            if (diff == 0m)
                return (0m, currentBalance);

            var reconciliationAccountName = $"Personal Finance Reconciliation [u:{userId}]";
            var accountType = diff > 0 ? AccountType.Revenue : AccountType.Expense;

            var reconciliationAccountId = await GetOrCreateAccountAsync(accountType, reconciliationAccountName, ct);

            var narration = string.IsNullOrWhiteSpace(note)
                ? $"Wallet reconciliation ({(diff > 0 ? "+" : "")}{diff:N2})"
                : $"Wallet reconciliation: {note.Trim()} ({(diff > 0 ? "+" : "")}{diff:N2})";

            var absDiff = Math.Abs(diff);

            var ledgerTx = LedgerTransaction.CreateDraft(narration, ReferenceType.Personal, walletId);

            if (diff > 0)
            {
                // Actual > computed: wallet gained value — debit wallet asset, credit reconciliation revenue
                ledgerTx.AddDebit(wallet.LedgerAccountId, Money.NGN(absDiff));
                ledgerTx.AddCredit(reconciliationAccountId, Money.NGN(absDiff));
            }
            else
            {
                // Actual < computed: wallet lost value — debit reconciliation expense, credit wallet asset
                ledgerTx.AddDebit(reconciliationAccountId, Money.NGN(absDiff));
                ledgerTx.AddCredit(wallet.LedgerAccountId, Money.NGN(absDiff));
            }

            await _ledgerTxRepo.AddAsync(ledgerTx, ct);
            await _ledgerTxRepo.SaveChangesAsync(ct);

            var personalTx = PersonalTransaction.Create(
                userId,
                walletId,
                null,
                absDiff,
                PersonalTransactionType.Adjustment,
                date,
                string.IsNullOrWhiteSpace(note) ? "Wallet reconciliation" : note.Trim(),
                TransactionSource.Reconciliation);

            personalTx.AttachLedgerTransaction(ledgerTx.Id);

            await _personalTxRepo.AddAsync(personalTx, ct);
            await _personalTxRepo.SaveChangesAsync(ct);

            return (diff, actualBalance);
        }

        private async Task<long> GetOrCreateAccountAsync(AccountType type, string name, CancellationToken ct)
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
