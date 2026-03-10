using System;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class PersonalInvestmentContribution
    {
        public long Id { get; private set; } // EF

        public long WalletId { get; private set; }
        public long TrancheId { get; private set; }

        public decimal Amount { get; private set; }
        public DateTime Date { get; private set; }
        public string? Description { get; private set; }

        public long LedgerTransactionId { get; private set; }
        public LedgerTransaction LedgerTransaction { get; private set; } = default!;

        private PersonalInvestmentContribution() { } // EF

        private PersonalInvestmentContribution(
            long walletId,
            long trancheId,
            decimal amount,
            DateTime date,
            string? description,
            LedgerTransaction ledgerTransaction)
        {
            if (walletId <= 0)
                throw new DomainException("WalletId must be a positive value.");

            if (trancheId <= 0)
                throw new DomainException("TrancheId must be a positive value.");

            if (amount <= 0)
                throw new DomainException("Amount must be greater than zero.");

            WalletId = walletId;
            TrancheId = trancheId;
            Amount = decimal.Round(amount, 2);
            Date = date.Kind == DateTimeKind.Unspecified
                ? date
                : DateTime.SpecifyKind(date, DateTimeKind.Unspecified);
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();

            LedgerTransaction = ledgerTransaction ?? throw new DomainException("LedgerTransaction is required.");
        }

        public static PersonalInvestmentContribution Create(
            long walletId,
            long trancheId,
            decimal amount,
            DateTime date,
            string? description,
            LedgerTransaction ledgerTransaction) =>
            new PersonalInvestmentContribution(walletId, trancheId, amount, date, description, ledgerTransaction);
    }
}
