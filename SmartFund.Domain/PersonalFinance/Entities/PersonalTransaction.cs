using System;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class PersonalTransaction
    {
        public long Id { get; private set; } // EF

        public long WalletId { get; private set; }
        public long? CategoryId { get; private set; }
        public decimal Amount { get; private set; }
        public PersonalTransactionType TransactionType { get; private set; }
        public DateTime Date { get; private set; }
        public string? Description { get; private set; }

        public long LedgerTransactionId { get; private set; }

        private PersonalTransaction() { } // EF

        private PersonalTransaction(
            long walletId,
            long? categoryId,
            decimal amount,
            PersonalTransactionType transactionType,
            DateTime date,
            string? description)
        {
            if (walletId <= 0)
                throw new DomainException("WalletId must be a positive value.");

            if (transactionType is PersonalTransactionType.Income or PersonalTransactionType.Expense)
            {
                if ((categoryId ?? 0) <= 0)
                    throw new DomainException("CategoryId must be provided for income/expense transactions.");
            }
            else
            {
                if (categoryId.HasValue && categoryId.Value <= 0)
                    throw new DomainException("CategoryId must be a positive value when provided.");
            }

            if (amount <= 0)
                throw new DomainException("Amount must be greater than zero.");

            WalletId = walletId;
            CategoryId = categoryId;
            Amount = decimal.Round(amount, 2);
            TransactionType = transactionType;
            Date = date.Kind == DateTimeKind.Unspecified
                ? date
                : DateTime.SpecifyKind(date, DateTimeKind.Unspecified);
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        }

        public static PersonalTransaction Create(
            long walletId,
            long? categoryId,
            decimal amount,
            PersonalTransactionType transactionType,
            DateTime date,
            string? description) =>
            new PersonalTransaction(walletId, categoryId, amount, transactionType, date, description);

        public void AttachLedgerTransaction(long ledgerTransactionId)
        {
            if (ledgerTransactionId <= 0)
                throw new DomainException("LedgerTransactionId must be a positive value.");

            if (LedgerTransactionId > 0)
                throw new DomainException("LedgerTransactionId has already been set.");

            LedgerTransactionId = ledgerTransactionId;
        }

        /// <summary>Set when this transaction was created from a bank import (provenance).</summary>
        public long? SourceConnectedBankAccountId { get; private set; }
        public long? SourceBankImportedTransactionId { get; private set; }

        public void AttachProvenance(long connectedBankAccountId, long bankImportedTransactionId)
        {
            if (connectedBankAccountId <= 0)
                throw new DomainException("SourceConnectedBankAccountId must be a positive value.");
            if (bankImportedTransactionId <= 0)
                throw new DomainException("SourceBankImportedTransactionId must be a positive value.");
            SourceConnectedBankAccountId = connectedBankAccountId;
            SourceBankImportedTransactionId = bankImportedTransactionId;
        }

        public void UpdateDescription(string? description)
        {
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
        }
    }
}
