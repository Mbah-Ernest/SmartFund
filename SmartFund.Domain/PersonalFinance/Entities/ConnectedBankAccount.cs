using System;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class ConnectedBankAccount
    {
        public long Id { get; private set; }

        public long UserId { get; private set; }

        /// <summary>The permanent account ID returned by Mono after code exchange.</summary>
        public string MonoAccountId { get; private set; } = default!;

        public string BankName { get; private set; } = default!;
        public string AccountNumber { get; private set; } = default!;
        public string AccountName { get; private set; } = default!;
        public string AccountType { get; private set; } = default!;
        public string Currency { get; private set; } = "NGN";

        /// <summary>Balance in the smallest unit (kobo for NGN), as returned by the Mono API.</summary>
        public long LastKnownBalanceKobo { get; private set; }

        public DateTime LastSyncedAtUtc { get; private set; }
        public DateTime ConnectedAtUtc { get; private set; }

        public BankAccountSyncStatus SyncStatus { get; private set; } = BankAccountSyncStatus.Active;
        public string? LastSyncError { get; private set; }
        public int TotalTransactionsSynced { get; private set; }

        private ConnectedBankAccount() { } // EF

        public static ConnectedBankAccount Create(
            long userId,
            string monoAccountId,
            string bankName,
            string accountNumber,
            string accountName,
            string accountType,
            string currency,
            long lastKnownBalanceKobo,
            DateTime utcNow)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            if (string.IsNullOrWhiteSpace(monoAccountId))
                throw new DomainException("Mono account ID is required.");
            if (string.IsNullOrWhiteSpace(bankName))
                throw new DomainException("Bank name is required.");

            return new ConnectedBankAccount
            {
                UserId = userId,
                MonoAccountId = monoAccountId.Trim(),
                BankName = bankName.Trim(),
                AccountNumber = (accountNumber ?? string.Empty).Trim(),
                AccountName = (accountName ?? string.Empty).Trim(),
                AccountType = (accountType ?? string.Empty).Trim(),
                Currency = string.IsNullOrWhiteSpace(currency) ? "NGN" : currency.Trim().ToUpperInvariant(),
                LastKnownBalanceKobo = lastKnownBalanceKobo,
                LastSyncedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc),
                ConnectedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc),
            };
        }

        public void UpdateBalance(long balanceKobo, DateTime utcNow)
        {
            LastKnownBalanceKobo = balanceKobo;
            LastSyncedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        }

        public void UpdateAccountInfo(
            string? bankName,
            string? accountNumber,
            string? accountName,
            string? accountType,
            string? currency)
        {
            if (!string.IsNullOrWhiteSpace(bankName))
                BankName = bankName.Trim();
            if (!string.IsNullOrWhiteSpace(accountNumber))
                AccountNumber = accountNumber.Trim();
            if (!string.IsNullOrWhiteSpace(accountName))
                AccountName = accountName.Trim();
            if (!string.IsNullOrWhiteSpace(accountType))
                AccountType = accountType.Trim();
            if (!string.IsNullOrWhiteSpace(currency))
                Currency = currency.Trim().ToUpperInvariant();
        }

        public void MarkSyncSuccess(int newTransactionCount, DateTime utcNow)
        {
            LastSyncedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
            LastSyncError = null;
            SyncStatus = BankAccountSyncStatus.Active;
            TotalTransactionsSynced += newTransactionCount;
        }

        public void MarkSyncError(string error, DateTime utcNow)
        {
            LastSyncedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
            LastSyncError = string.IsNullOrWhiteSpace(error) ? "Unknown sync error." : error.Trim();
            SyncStatus = BankAccountSyncStatus.Error;
        }

        public void MarkReauthRequired()
        {
            SyncStatus = BankAccountSyncStatus.ReauthRequired;
        }

        public void MarkActive()
        {
            SyncStatus = BankAccountSyncStatus.Active;
            LastSyncError = null;
        }

        /// <summary>The PersonalWallet that mirrors this bank account's balance.</summary>
        public long? PersonalWalletId { get; private set; }

        public void LinkWallet(long walletId)
        {
            if (walletId <= 0)
                throw new DomainException("WalletId must be a positive value.");
            PersonalWalletId = walletId;
        }
    }
}
