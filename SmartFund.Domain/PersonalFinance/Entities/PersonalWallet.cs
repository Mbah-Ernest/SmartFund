using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class PersonalWallet
    {
        public long Id { get; private set; } // EF

        public string Name { get; private set; } = default!;
        public string Currency { get; private set; } = "NGN";
        public long LedgerAccountId { get; private set; }
        public DateTime CreatedAt { get; private set; }

        private PersonalWallet() { } // EF

        private PersonalWallet(string name, string currency, long ledgerAccountId, DateTime createdAtUtc)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Wallet name is required.");

            if (string.IsNullOrWhiteSpace(currency))
                throw new DomainException("Currency is required.");

            if (ledgerAccountId <= 0)
                throw new DomainException("LedgerAccountId must be a positive value.");

            Name = name.Trim();
            Currency = currency.Trim().ToUpperInvariant();
            LedgerAccountId = ledgerAccountId;
            CreatedAt = DateTime.SpecifyKind(createdAtUtc, DateTimeKind.Utc);
        }

        public static PersonalWallet Create(string name, string currency, long ledgerAccountId, DateTime createdAtUtc) =>
            new PersonalWallet(name, currency, ledgerAccountId, createdAtUtc);

        public static PersonalWallet Create(string name, string currency, long ledgerAccountId) =>
            new PersonalWallet(name, currency, ledgerAccountId, DateTime.UtcNow);

        public void Rename(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Wallet name is required.");

            Name = name.Trim();
        }
    }
}
