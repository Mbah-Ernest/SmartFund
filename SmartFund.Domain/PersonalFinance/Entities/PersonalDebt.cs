using System;
using System.Collections.Generic;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class PersonalDebt
    {
        public long Id { get; private set; }
        public long UserId { get; private set; }
        public string CreditorName { get; private set; } = default!;
        public decimal PrincipalAmount { get; private set; }
        public decimal TotalAmountDue { get; private set; }
        public decimal TotalPaid { get; private set; }
        public DateTime DueDate { get; private set; }
        public string? Description { get; private set; }
        public DebtStatus Status { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime? UpdatedAt { get; private set; }

        private readonly List<PersonalDebtPayment> _payments = new();
        public IReadOnlyCollection<PersonalDebtPayment> Payments => _payments.AsReadOnly();

        // Computed — not stored
        public decimal RemainingBalance => decimal.Round(TotalAmountDue - TotalPaid, 2);
        public decimal InterestAmount => decimal.Round(TotalAmountDue - PrincipalAmount, 2);
        public decimal ProgressPercent => TotalAmountDue == 0m ? 100m : decimal.Round((TotalPaid / TotalAmountDue) * 100m, 2);
        public int DaysUntilDue => (int)(DueDate.Date - DateTime.UtcNow.Date).TotalDays;

        private PersonalDebt() { } // EF

        private PersonalDebt(long userId, string creditorName, decimal principalAmount,
            decimal totalAmountDue, DateTime dueDate, string? description, DateTime nowUtc)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            if (string.IsNullOrWhiteSpace(creditorName))
                throw new DomainException("Creditor name is required.");
            if (principalAmount <= 0)
                throw new DomainException("Principal amount must be greater than zero.");
            if (totalAmountDue < principalAmount)
                throw new DomainException("Total amount due cannot be less than the principal amount.");

            UserId = userId;
            CreditorName = creditorName.Trim();
            PrincipalAmount = decimal.Round(principalAmount, 2);
            TotalAmountDue = decimal.Round(totalAmountDue, 2);
            TotalPaid = 0m;
            DueDate = DateTime.SpecifyKind(dueDate.Date, DateTimeKind.Utc);
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
            Status = DebtStatus.Active;
            CreatedAt = DateTime.SpecifyKind(nowUtc, DateTimeKind.Utc);
        }

        public static PersonalDebt Create(long userId, string creditorName, decimal principalAmount,
            decimal totalAmountDue, DateTime dueDate, string? description) =>
            new PersonalDebt(userId, creditorName, principalAmount, totalAmountDue, dueDate, description, DateTime.UtcNow);

        public PersonalDebtPayment RecordPayment(decimal amount, DateTime paidOnUtc, string? note)
        {
            if (Status == DebtStatus.PaidOff)
                throw new DomainException("This debt is already fully paid off.");
            if (Status == DebtStatus.Forgiven)
                throw new DomainException("This debt has been forgiven and cannot receive payments.");
            if (amount <= 0)
                throw new DomainException("Payment amount must be greater than zero.");

            var remaining = RemainingBalance;
            if (amount > remaining)
                throw new DomainException($"Payment of {amount:N2} exceeds the remaining balance of {remaining:N2}.");

            TotalPaid = decimal.Round(TotalPaid + amount, 2);
            UpdatedAt = DateTime.UtcNow;

            if (TotalPaid >= TotalAmountDue)
                Status = DebtStatus.PaidOff;

            var payment = PersonalDebtPayment.Create(Id, amount, paidOnUtc, note);
            _payments.Add(payment);
            return payment;
        }

        public void UpdateDetails(string creditorName, decimal totalAmountDue, DateTime dueDate, string? description)
        {
            if (string.IsNullOrWhiteSpace(creditorName))
                throw new DomainException("Creditor name is required.");
            if (totalAmountDue < PrincipalAmount)
                throw new DomainException("Total amount due cannot be less than the principal amount.");
            if (totalAmountDue < TotalPaid)
                throw new DomainException("Total amount due cannot be less than the amount already paid.");

            CreditorName = creditorName.Trim();
            TotalAmountDue = decimal.Round(totalAmountDue, 2);
            DueDate = DateTime.SpecifyKind(dueDate.Date, DateTimeKind.Utc);
            Description = string.IsNullOrWhiteSpace(description) ? null : description.Trim();
            UpdatedAt = DateTime.UtcNow;

            if (TotalPaid >= TotalAmountDue)
                Status = DebtStatus.PaidOff;
            else if (Status == DebtStatus.PaidOff)
                Status = DebtStatus.Active;
        }

        public void MarkForgiven()
        {
            if (Status == DebtStatus.PaidOff)
                throw new DomainException("Cannot mark a paid-off debt as forgiven.");
            Status = DebtStatus.Forgiven;
            UpdatedAt = DateTime.UtcNow;
        }
    }
}
