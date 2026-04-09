using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class PersonalDebtPayment
    {
        public long Id { get; private set; }
        public long DebtId { get; private set; }
        public decimal Amount { get; private set; }
        public DateTime PaidOn { get; private set; }
        public string? Note { get; private set; }
        public DateTime RecordedAt { get; private set; }

        private PersonalDebtPayment() { } // EF

        private PersonalDebtPayment(long debtId, decimal amount, DateTime paidOnUtc, string? note, DateTime nowUtc)
        {
            if (debtId <= 0)
                throw new DomainException("DebtId must be a positive value.");
            if (amount <= 0)
                throw new DomainException("Payment amount must be greater than zero.");

            DebtId = debtId;
            Amount = decimal.Round(amount, 2);
            PaidOn = DateTime.SpecifyKind(paidOnUtc.Date, DateTimeKind.Utc);
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim();
            RecordedAt = DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc);
        }

        internal static PersonalDebtPayment Create(long debtId, decimal amount, DateTime paidOnUtc, string? note) =>
            new PersonalDebtPayment(debtId, amount, paidOnUtc, note, DateTime.UtcNow);
    }
}
