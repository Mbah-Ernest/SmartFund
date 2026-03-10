using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Entities
{
    public sealed class InsuranceWallet
    {
        public long Id { get; private set; } // EF

        public decimal Balance { get; private set; }
        public InsuranceWalletType Type { get; private set; }

        public long? DealId { get; private set; }

        public long? ReserveAccountId { get; private set; }

        private InsuranceWallet() { } // EF

        private InsuranceWallet(InsuranceWalletType type, long? dealId)
        {
            if (type == InsuranceWalletType.Deal && (!dealId.HasValue || dealId.Value <= 0))
                throw new DomainException("DealId is required for a Deal insurance wallet.");

            Type = type;
            DealId = type == InsuranceWalletType.Deal ? dealId : null;
            Balance = 0m;
        }

        public static InsuranceWallet CreateGlobal() => new InsuranceWallet(InsuranceWalletType.Global, null);

        public static InsuranceWallet CreateForDeal(long dealId) => new InsuranceWallet(InsuranceWalletType.Deal, dealId);

        public void SetReserveAccount(long accountId)
        {
            if (accountId <= 0) throw new DomainException("ReserveAccountId must be valid.");
            ReserveAccountId = accountId;
        }

        public void Fund(decimal amount)
        {
            if (amount <= 0) throw new DomainException("Amount must be greater than zero.");
            Balance = decimal.Round(Balance + amount, 2);
        }

        public void Use(decimal amount)
        {
            if (amount <= 0) throw new DomainException("Amount must be greater than zero.");
            if (Balance < amount) throw new DomainException("Insufficient insurance reserve balance.");
            Balance = decimal.Round(Balance - amount, 2);
        }
    }
}
