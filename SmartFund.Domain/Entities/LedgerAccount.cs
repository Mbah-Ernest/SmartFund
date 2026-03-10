using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Entities
{
    public sealed class LedgerAccount
    {
        public long Id { get; private set; } // EF

        public string Name { get; private set; } = default!;
        public AccountType Type { get; private set; }
        public string Currency { get; private set; } = "NGN";

        // SmartFund linkage (optional but powerful)
        public ReferenceType ReferenceType { get; private set; } = ReferenceType.None;
        public long? ReferenceId { get; private set; }

        private LedgerAccount() { } // EF

        private LedgerAccount(string name, AccountType type, ReferenceType referenceType, long? referenceId)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Account name is required.");

            Name = name.Trim();
            Type = type;
            Currency = "NGN";
            ReferenceType = referenceType;
            ReferenceId = referenceId;
        }

        public static LedgerAccount Create(
            string name,
            AccountType type,
            ReferenceType referenceType = ReferenceType.None,
            long? referenceId = null)
            => new LedgerAccount(name, type, referenceType, referenceId);
    }
}