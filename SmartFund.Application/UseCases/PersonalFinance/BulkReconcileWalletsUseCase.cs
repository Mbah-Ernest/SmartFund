using System;
using System.Collections.Generic;
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
    public sealed class BulkReconcileWalletsUseCase
    {
        private readonly IPersonalWalletRepository _walletRepo;
        private readonly IPersonalTransactionRepository _personalTxRepo;
        private readonly ILedgerAccountRepository _accountRepo;
        private readonly ILedgerTransactionRepository _ledgerTxRepo;

        public BulkReconcileWalletsUseCase(
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

        public record Entry(long WalletId, decimal ActualBalance);
        public record AdjustedWallet(long WalletId, string WalletName, decimal Drift, decimal NewBalance);
        public record Result(List<AdjustedWallet> Adjusted, List<long> Skipped);

        public async Task<Result> ExecuteAsync(
            long userId,
            IReadOnlyList<Entry> entries,
            DateTime date,
            CancellationToken ct)
        {
            if (userId <= 0) throw new DomainException("UserId must be valid.");
            if (entries is null || entries.Count == 0) throw new DomainException("At least one wallet entry is required.");
            if (entries.Any(e => e.ActualBalance < 0)) throw new DomainException("Actual balance cannot be negative.");

            var wallets = await _walletRepo.ListByUserAsync(userId, ct);
            var walletMap = wallets.ToDictionary(w => w.Id);

            var toAdjust = new List<(PersonalWallet Wallet, decimal ActualBalance, decimal Diff)>();
            var skipped = new List<long>();

            foreach (var entry in entries)
            {
                if (!walletMap.TryGetValue(entry.WalletId, out var wallet))
                    throw new DomainException($"Wallet {entry.WalletId} not found.");

                var ledgerBalance = await _ledgerTxRepo.GetPostedBalanceForAccountAsync(wallet.LedgerAccountId, ct);
                var currentBalance = wallet.OpeningBalance + ledgerBalance;
                var diff = entry.ActualBalance - currentBalance;

                if (diff == 0m)
                {
                    skipped.Add(wallet.Id);
                    continue;
                }

                toAdjust.Add((wallet, entry.ActualBalance, diff));
            }

            if (toAdjust.Count == 0)
                return new Result(new List<AdjustedWallet>(), skipped);

            var revenueAccountName = $"Personal Finance Reconciliation [u:{userId}]";
            var expenseAccountName = $"Personal Finance Reconciliation [u:{userId}]";

            long? revenueAccountId = toAdjust.Any(x => x.Diff > 0)
                ? await GetOrCreateAccountAsync(AccountType.Revenue, revenueAccountName, ct)
                : null;

            long? expenseAccountId = toAdjust.Any(x => x.Diff < 0)
                ? await GetOrCreateAccountAsync(AccountType.Expense, expenseAccountName, ct)
                : null;

            var utcDate = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
            var dateLabel = utcDate.ToString("MMM d, yyyy");
            var narration = $"Balance correction — {dateLabel}";

            // Build all ledger transactions and stage them
            var staged = new List<(LedgerTransaction LedgerTx, PersonalWallet Wallet, decimal ActualBalance, decimal Diff)>();

            foreach (var (wallet, actualBalance, diff) in toAdjust)
            {
                var absDiff = Math.Abs(diff);
                var reconciliationAccountId = diff > 0 ? revenueAccountId!.Value : expenseAccountId!.Value;

                var ledgerTx = LedgerTransaction.CreateDraft(narration, ReferenceType.Personal, wallet.Id);

                if (diff > 0)
                {
                    ledgerTx.AddDebit(wallet.LedgerAccountId, Money.NGN(absDiff));
                    ledgerTx.AddCredit(reconciliationAccountId, Money.NGN(absDiff));
                }
                else
                {
                    ledgerTx.AddDebit(reconciliationAccountId, Money.NGN(absDiff));
                    ledgerTx.AddCredit(wallet.LedgerAccountId, Money.NGN(absDiff));
                }

                await _ledgerTxRepo.AddAsync(ledgerTx, ct);
                staged.Add((ledgerTx, wallet, actualBalance, diff));
            }

            // Single save for all ledger transactions — populates IDs
            await _ledgerTxRepo.SaveChangesAsync(ct);

            // Build and stage all personal transactions
            foreach (var (ledgerTx, wallet, _, diff) in staged)
            {
                var personalTx = PersonalTransaction.Create(
                    userId,
                    wallet.Id,
                    null,
                    Math.Abs(diff),
                    PersonalTransactionType.Adjustment,
                    date,
                    narration,
                    TransactionSource.Reconciliation);

                personalTx.AttachLedgerTransaction(ledgerTx.Id);
                await _personalTxRepo.AddAsync(personalTx, ct);
            }

            // Single save for all personal transactions
            await _personalTxRepo.SaveChangesAsync(ct);

            var adjusted = staged
                .Select(x => new AdjustedWallet(x.Wallet.Id, x.Wallet.Name, x.Diff, x.ActualBalance))
                .ToList();

            return new Result(adjusted, skipped);
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
