using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Services.PersonalFinance
{
    public sealed class PersonalWalletService : IPersonalWalletService
    {
        private readonly IPersonalWalletRepository _walletRepo;
        private readonly ILedgerAccountRepository _accountRepo;
        private readonly ILedgerTransactionRepository _txRepo;

        public PersonalWalletService(
            IPersonalWalletRepository walletRepo,
            ILedgerAccountRepository accountRepo,
            ILedgerTransactionRepository txRepo)
        {
            _walletRepo = walletRepo;
            _accountRepo = accountRepo;
            _txRepo = txRepo;
        }

        public async Task<PersonalWallet> CreateWalletAsync(long userId, string name, string currency, CancellationToken ct)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be valid.");
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Wallet name is required.");
            if (string.IsNullOrWhiteSpace(currency))
                throw new DomainException("Currency is required.");

            var ledgerAccount = LedgerAccount.Create(
                $"Personal Wallet: {name.Trim()} [u:{userId}]",
                AccountType.Asset,
                ReferenceType.Personal);

            await _accountRepo.AddAsync(ledgerAccount, ct);
            await _accountRepo.SaveChangesAsync(ct);

            var wallet = PersonalWallet.Create(userId, name, currency, ledgerAccount.Id);

            await _walletRepo.AddAsync(wallet, ct);
            await _walletRepo.SaveChangesAsync(ct);

            return wallet;
        }

        public Task<PersonalWallet?> GetWalletAsync(long walletId, CancellationToken ct)
        {
            if (walletId <= 0)
                throw new DomainException("WalletId must be valid.");
            return _walletRepo.GetByIdAsync(walletId, ct);
        }

        public Task<PersonalWallet?> GetWalletForUserAsync(long walletId, long userId, CancellationToken ct)
        {
            if (walletId <= 0)
                throw new DomainException("WalletId must be valid.");
            return _walletRepo.GetByIdForUserAsync(walletId, userId, ct);
        }

        public Task<List<PersonalWallet>> GetAllWalletsAsync(CancellationToken ct) =>
            _walletRepo.ListAsync(ct);

        public Task<List<PersonalWallet>> GetAllWalletsByUserAsync(long userId, CancellationToken ct) =>
            _walletRepo.ListByUserAsync(userId, ct);

        public async Task<decimal> GetWalletBalanceAsync(long walletId, CancellationToken ct)
        {
            if (walletId <= 0)
                throw new DomainException("WalletId must be valid.");

            var wallet = await _walletRepo.GetByIdAsync(walletId, ct);

            if (wallet is null)
                throw new DomainException("Wallet not found.");

            // Effective balance = opening balance + all posted ledger entries.
            var ledgerBalance = await _txRepo.GetPostedBalanceForAccountAsync(wallet.LedgerAccountId, ct);
            return wallet.OpeningBalance + ledgerBalance;
        }

        public async Task SetOpeningBalanceAsync(long walletId, long userId, decimal amount, DateTime date, CancellationToken ct)
        {
            if (walletId <= 0)
                throw new DomainException("WalletId must be valid.");
            if (userId <= 0)
                throw new DomainException("UserId must be valid.");

            var wallet = await _walletRepo.GetByIdForUserAsync(walletId, userId, ct);
            if (wallet is null)
                throw new DomainException("Wallet not found.");

            wallet.SetOpeningBalance(amount, date);

            await _walletRepo.SaveChangesAsync(ct);
        }
    }
}
