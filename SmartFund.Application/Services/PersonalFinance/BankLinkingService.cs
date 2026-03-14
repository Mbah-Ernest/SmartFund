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
        private readonly IMonoApiClient _mono;
        private readonly IPersonalWalletService _walletService;

        public BankLinkingService(
            IConnectedBankAccountRepository accountRepo,
            BankSyncService syncService,
            IMonoApiClient mono,
            IPersonalWalletService walletService)
        {
            _accountRepo = accountRepo;
            _syncService = syncService;
            _mono = mono;
            _walletService = walletService;
        }

        /// <summary>Returns a server-side Mono Connect token for the browser widget. Secret never leaves server.</summary>
        public Task<string> GenerateConnectTokenAsync(CancellationToken ct) =>
            _mono.GenerateConnectTokenAsync(ct);

        /// <summary>Exchanges auth code → Mono account ID, saves account, creates bank wallet, triggers backfill sync.</summary>
        public async Task<ConnectedBankAccount> ConnectAccountAsync(string authCode, CancellationToken ct)
        {
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
                await EnsureBankWalletAsync(existing, ct);
                await _accountRepo.SaveChangesAsync(ct);
                return existing;
            }

            var info = await _mono.GetAccountInfoAsync(monoAccountId, ct);

            var account = ConnectedBankAccount.Create(
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
            await EnsureBankWalletAsync(account, ct);
            await _accountRepo.SaveChangesAsync(ct);

            // Fire and forget — initial backfill runs in background
            _ = Task.Run(() => _syncService.SyncAccountAsync(account, CancellationToken.None), CancellationToken.None);

            return account;
        }

        /// <summary>Removes a connected account (history preserved in BankImportedTransactions).</summary>
        public async Task DisconnectAsync(long accountId, CancellationToken ct)
        {
            var account = await _accountRepo.GetByIdAsync(accountId, ct)
                ?? throw new DomainException("Connected account not found.");

            await _accountRepo.RemoveAsync(account, ct);
            await _accountRepo.SaveChangesAsync(ct);
        }

        /// <summary>Generates a reauth token for an account that needs reconnection.</summary>
        public async Task<string> GenerateReauthTokenAsync(long accountId, CancellationToken ct)
        {
            var account = await _accountRepo.GetByIdAsync(accountId, ct)
                ?? throw new DomainException("Connected account not found.");

            var token = await _mono.GenerateConnectTokenAsync(ct);
            account.MarkActive();
            await EnsureBankWalletAsync(account, ct);
            await _accountRepo.SaveChangesAsync(ct);
            return token;
        }

        // ── private ──────────────────────────────────────────────────────────

        private async Task EnsureBankWalletAsync(ConnectedBankAccount account, CancellationToken ct)
        {
            if (account.PersonalWalletId.HasValue)
                return; // already linked

            var last4 = account.AccountNumber.Length >= 4
                ? account.AccountNumber[^4..]
                : account.AccountNumber;

            var walletName = $"{account.BankName} \u2022\u2022\u2022\u2022{last4}"; // ••••1234

            var wallet = await _walletService.CreateWalletAsync(walletName, account.Currency, ct);
            account.LinkWallet(wallet.Id);
        }
    }
}
