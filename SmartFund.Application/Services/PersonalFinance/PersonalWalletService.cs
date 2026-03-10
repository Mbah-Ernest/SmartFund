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

        public async Task<PersonalWallet> CreateWalletAsync(string name, string currency, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Wallet name is required.");

            if (string.IsNullOrWhiteSpace(currency))
                throw new DomainException("Currency is required.");

            var ledgerAccount = LedgerAccount.Create(
                $"Personal Wallet: {name.Trim()}",
                AccountType.Asset,
                ReferenceType.Personal);

            await _accountRepo.AddAsync(ledgerAccount, ct);
            await _accountRepo.SaveChangesAsync(ct);

            var wallet = PersonalWallet.Create(name, currency, ledgerAccount.Id);

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

        public Task<List<PersonalWallet>> GetAllWalletsAsync(CancellationToken ct) =>
            _walletRepo.ListAsync(ct);

        public async Task<decimal> GetWalletBalanceAsync(long walletId, CancellationToken ct)
        {
            if (walletId <= 0)
                throw new DomainException("WalletId must be valid.");

            var wallet = await _walletRepo.GetByIdAsync(walletId, ct);

            if (wallet is null)
                throw new DomainException("Wallet not found.");

            // Wallet balance is derived from ledger entries (posted transactions only).
            return await _txRepo.GetPostedBalanceForAccountAsync(wallet.LedgerAccountId, ct);
        }
    }
}
