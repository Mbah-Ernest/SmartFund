using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class ConnectedBankAccount
    {
        public long Id { get; private set; }

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

        private ConnectedBankAccount() { } // EF

        public static ConnectedBankAccount Create(
            string monoAccountId,
            string bankName,
            string accountNumber,
            string accountName,
            string accountType,
            string currency,
            long lastKnownBalanceKobo,
            DateTime utcNow)
        {
            if (string.IsNullOrWhiteSpace(monoAccountId))
                throw new DomainException("Mono account ID is required.");
            if (string.IsNullOrWhiteSpace(bankName))
                throw new DomainException("Bank name is required.");

            return new ConnectedBankAccount
            {
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
    }
}
