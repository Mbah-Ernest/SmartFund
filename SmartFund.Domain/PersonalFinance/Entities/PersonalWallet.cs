using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class PersonalWallet
    {
        public long Id { get; private set; } // EF

        public long UserId { get; private set; }
        public string Name { get; private set; } = default!;
        public string Currency { get; private set; } = "NGN";
        public long LedgerAccountId { get; private set; }
        public DateTime CreatedAt { get; private set; }

        private PersonalWallet() { } // EF

        private PersonalWallet(long userId, string name, string currency, long ledgerAccountId, DateTime createdAtUtc)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Wallet name is required.");
            if (string.IsNullOrWhiteSpace(currency))
                throw new DomainException("Currency is required.");
            if (ledgerAccountId <= 0)
                throw new DomainException("LedgerAccountId must be a positive value.");

            UserId = userId;
            Name = name.Trim();
            Currency = currency.Trim().ToUpperInvariant();
            LedgerAccountId = ledgerAccountId;
            CreatedAt = DateTime.SpecifyKind(createdAtUtc, DateTimeKind.Utc);
        }

        public static PersonalWallet Create(long userId, string name, string currency, long ledgerAccountId, DateTime createdAtUtc) =>
            new PersonalWallet(userId, name, currency, ledgerAccountId, createdAtUtc);

        public static PersonalWallet Create(long userId, string name, string currency, long ledgerAccountId) =>
            new PersonalWallet(userId, name, currency, ledgerAccountId, DateTime.UtcNow);

        public decimal OpeningBalance { get; private set; } = 0m;
        public DateTime? OpeningBalanceDate { get; private set; }

        public void Rename(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Wallet name is required.");

            Name = name.Trim();
        }

        public void SetOpeningBalance(decimal amount, DateTime date)
        {
            if (amount < 0)
                throw new DomainException("Opening balance cannot be negative.");
            if (date.Date > DateTime.UtcNow.Date)
                throw new DomainException("Opening balance date cannot be in the future.");

            OpeningBalance = decimal.Round(amount, 2);
            OpeningBalanceDate = DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
        }
    }
}
