using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Application.Services.PersonalFinance
{
    public sealed class BankLinkingService
    {
        private const int MaxConnectedAccounts = 5;

        private readonly IConnectedBankAccountRepository _accountRepo;
        private readonly BankSyncService _syncService;
        private readonly IBankImportedTransactionRepository _importRepo;
        private readonly IMonoApiClient _mono;
        private readonly IPersonalWalletService _walletService;

        public BankLinkingService(
            IConnectedBankAccountRepository accountRepo,
            BankSyncService syncService,
            IBankImportedTransactionRepository importRepo,
            IMonoApiClient mono,
            IPersonalWalletService walletService)
        {
            _accountRepo = accountRepo;
            _syncService = syncService;
            _importRepo = importRepo;
            _mono = mono;
            _walletService = walletService;
        }

        /// <summary>Returns a server-side Mono Connect token for the browser widget. Secret never leaves server.</summary>
        public Task<string> GenerateConnectTokenAsync(CancellationToken ct) =>
            _mono.GenerateConnectTokenAsync(ct);

        /// <summary>Exchanges auth code → Mono account ID, saves account, creates bank wallet, triggers backfill sync.</summary>
        public async Task<ConnectedBankAccount> ConnectAccountAsync(long userId, string authCode, CancellationToken ct)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be valid.");
            if (string.IsNullOrWhiteSpace(authCode))
                throw new DomainException("Auth code is required.");

            var count = await _accountRepo.CountAsync(ct);
            if (count >= MaxConnectedAccounts)
                throw new DomainException($"Maximum of {MaxConnectedAccounts} connected accounts reached.");

            var monoAccountId = await _mono.ExchangeCodeAsync(authCode, ct);

            // Idempotent: if already connected, ensure wallet exists and return
            var existing = await _accountRepo.GetByMonoAccountIdAsync(monoAccountId, ct);
            if (existing is not null)
            {
                existing.MarkActive();
                await EnsureBankWalletAsync(userId, existing, ct);
                await _accountRepo.SaveChangesAsync(ct);
                return existing;
            }

            var info = await _mono.GetAccountInfoAsync(monoAccountId, ct);

            var account = ConnectedBankAccount.Create(
                userId,
                info.MonoAccountId,
                info.BankName,
                info.AccountNumber,
                info.AccountName,
                info.AccountType,
                info.Currency,
                info.BalanceKobo,
                DateTime.UtcNow);

            await _accountRepo.AddAsync(account, ct);
            await _accountRepo.SaveChangesAsync(ct);

            // Create the linked bank wallet
            await EnsureBankWalletAsync(userId, account, ct);
            await _accountRepo.SaveChangesAsync(ct);

            // Run initial sync in-request so the scoped repositories/DbContext are still valid
            // and connected-account transactions become visible immediately after linking.
            await _syncService.SyncAccountAsync(account, ct);

            return account;
        }

        /// <summary>Generates a reauth token for an account that needs reconnection.</summary>
        public async Task<string> GenerateReauthTokenAsync(long userId, long accountId, CancellationToken ct)
        {
            var account = await _accountRepo.GetByIdForUserAsync(accountId, userId, ct)
                ?? throw new DomainException("Connected account not found.");

            var token = await _mono.GenerateConnectTokenAsync(ct);
            account.MarkActive();
            await EnsureBankWalletAsync(userId, account, ct);
            await _accountRepo.SaveChangesAsync(ct);
            return token;
        }

        /// <summary>Removes a connected account scoped to user.</summary>
        public async Task DisconnectAsync(long userId, long accountId, CancellationToken ct)
        {
            var account = await _accountRepo.GetByIdForUserAsync(accountId, userId, ct)
                ?? throw new DomainException("Connected account not found.");

            await _importRepo.DeleteByAccountAsync(accountId, ct);
            await _accountRepo.RemoveAsync(account, ct);
            await _accountRepo.SaveChangesAsync(ct);
        }

        // ── private ──────────────────────────────────────────────────────────

        private async Task EnsureBankWalletAsync(long userId, ConnectedBankAccount account, CancellationToken ct)
        {
            if (account.PersonalWalletId.HasValue)
                return; // already linked

            var last4 = account.AccountNumber.Length >= 4
                ? account.AccountNumber[^4..]
                : account.AccountNumber;

            var walletName = $"{account.BankName} \u2022\u2022\u2022\u2022{last4}"; // ••••1234

            var wallet = await _walletService.CreateWalletAsync(userId, walletName, account.Currency, ct);
            account.LinkWallet(wallet.Id);
        }
    }
}
