using System;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class PersonalTransaction
    {
        public long Id { get; private set; } // EF

        public long UserId { get; private set; }
        public long WalletId { get; private set; }
        public long? CategoryId { get; private set; }
        public decimal Amount { get; private set; }
        public PersonalTransactionType TransactionType { get; private set; }
        public DateTime Date { get; private set; }
        public string? Description { get; private set; }
        public TransactionSource Source { get; private set; } = TransactionSource.Manual;

        public long LedgerTransactionId { get; private set; }

        private PersonalTransaction() { } // EF

        private PersonalTransaction(
            long userId,
            long walletId,
            long? categoryId,
            decimal amount,
            PersonalTransactionType transactionType,
            DateTime date,
            string? description,
            TransactionSource source = TransactionSource.Manual)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
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

            UserId = userId;
            WalletId = walletId;
            CategoryId = categoryId;
            Amount = decimal.Round(amount, 2);
            TransactionType = transactionType;
            Date = date.Kind == DateTimeKind.Unspecified
                ? date
                : DateTime.SpecifyKind(date, DateTimeKind.Unspecified);
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
            Source = source;
        }

        public static PersonalTransaction Create(
            long userId,
            long walletId,
            long? categoryId,
            decimal amount,
            PersonalTransactionType transactionType,
            DateTime date,
            string? description) =>
            new PersonalTransaction(userId, walletId, categoryId, amount, transactionType, date, description);

        public static PersonalTransaction Create(
            long userId,
            long walletId,
            long? categoryId,
            decimal amount,
            PersonalTransactionType transactionType,
            DateTime date,
            string? description,
            TransactionSource source) =>
            new PersonalTransaction(userId, walletId, categoryId, amount, transactionType, date, description, source);

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

        public bool IsSmallCharge { get; private set; }
        public string? SmallChargeCategory { get; private set; }

        public void MarkAsSmallCharge(string category)
        {
            if (string.IsNullOrWhiteSpace(category))
                throw new DomainException("SmallChargeCategory is required.");
            IsSmallCharge = true;
            SmallChargeCategory = category.Trim().ToLowerInvariant();
        }
    }
}
