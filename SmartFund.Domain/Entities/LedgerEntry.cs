using SmartFund.Domain.Exceptions;
using SmartFund.Domain.ValueObjects;

namespace SmartFund.Domain.Entities
{
    public sealed class LedgerEntry
    {
        public long Id { get; private set; } // for EF later

        public long AccountId { get; private set; }
        public Money Debit { get; private set; }
        public Money Credit { get; private set; }

        private LedgerEntry() { } // EF

        private LedgerEntry(long accountId, Money debit, Money credit)
        {
            if (accountId <= 0)
                throw new DomainException("AccountId must be a positive value.");

            // XOR rule: exactly one side > 0
            var debitIsZero = debit.IsZero();
            var creditIsZero = credit.IsZero();

            if (debitIsZero == creditIsZero)
                throw new DomainException("Entry must have exactly one of Debit or Credit greater than zero.");

            AccountId = accountId;
            Debit = debit;
            Credit = credit;
        }

        public static LedgerEntry CreateDebit(long accountId, Money amount)
        {
            if (amount.IsZero())
                throw new DomainException("Debit amount must be greater than zero.");

            return new LedgerEntry(accountId, amount, Money.Zero());
        }

        public static LedgerEntry CreateCredit(long accountId, Money amount)
        {
            if (amount.IsZero())
                throw new DomainException("Credit amount must be greater than zero.");

            return new LedgerEntry(accountId, Money.Zero(), amount);
        }
    }
}