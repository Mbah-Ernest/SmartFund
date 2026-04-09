using System;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Entities
{
    public sealed class LoanApplication
    {
        public long Id { get; private set; }
        public long UserId { get; private set; }
        public decimal Amount { get; private set; }
        public LoanPurpose PurposeCategory { get; private set; }
        public string PurposeDescription { get; private set; } = default!;
        public int DurationDays { get; private set; }
        public int RepaymentInstallments { get; private set; }
        public string AccountNumber { get; private set; } = default!;
        public decimal DailyInterestRate { get; private set; }
        public decimal InterestAmount { get; private set; }
        public decimal TotalRepayable { get; private set; }
        public decimal InstallmentAmount { get; private set; }
        public string BankName { get; private set; } = default!;
        public string AccountName { get; private set; } = default!;
        public LoanApplicationStatus Status { get; private set; }
        public DateTime SubmittedAtUtc { get; private set; }
        public DateTime? ReviewedAtUtc { get; private set; }
        public long? ReviewedByUserId { get; private set; }
        public string? AdminNote { get; private set; }

        private LoanApplication() { } // EF

        private LoanApplication(long userId, decimal amount, LoanPurpose purposeCategory,
            string purposeDescription, int durationDays, int repaymentInstallments,
            string accountNumber, string bankName, string accountName, DateTime submittedAtUtc)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            if (amount <= 0)
                throw new DomainException("Loan amount must be greater than zero.");
            if (durationDays <= 0)
                throw new DomainException("Loan duration must be at least 1 day.");
            if (repaymentInstallments is < 1 or > 3)
                throw new DomainException("Repayment installments must be 1, 2, or 3.");
            if (string.IsNullOrWhiteSpace(accountNumber))
                throw new DomainException("Account number is required.");
            if (string.IsNullOrWhiteSpace(bankName))
                throw new DomainException("Bank name is required.");
            if (string.IsNullOrWhiteSpace(accountName))
                throw new DomainException("Account name is required.");

            UserId = userId;
            Amount = amount;
            PurposeCategory = purposeCategory;
            PurposeDescription = purposeDescription.Trim();
            DurationDays = durationDays;
            RepaymentInstallments = repaymentInstallments;
            AccountNumber = accountNumber.Trim();
            BankName = bankName.Trim();
            AccountName = accountName.Trim();
            DailyInterestRate = GetDailyInterestRate(amount);
            InterestAmount = decimal.Round(amount * DailyInterestRate * durationDays, 2, MidpointRounding.AwayFromZero);
            TotalRepayable = amount + InterestAmount;
            InstallmentAmount = decimal.Round(TotalRepayable / repaymentInstallments, 2, MidpointRounding.AwayFromZero);
            Status = LoanApplicationStatus.Pending;
            SubmittedAtUtc = DateTime.SpecifyKind(submittedAtUtc, DateTimeKind.Utc);
        }

        public static LoanApplication Submit(long userId, decimal amount, LoanPurpose purposeCategory,
            string purposeDescription, int durationDays, int repaymentInstallments,
            string accountNumber, string bankName, string accountName, DateTime submittedAtUtc) =>
            new LoanApplication(userId, amount, purposeCategory, purposeDescription,
                durationDays, repaymentInstallments, accountNumber, bankName, accountName, submittedAtUtc);

        public void StartReview()
        {
            if (Status != LoanApplicationStatus.Pending)
                throw new DomainException($"Cannot start review: application is {Status}.");
            Status = LoanApplicationStatus.UnderReview;
        }

        public void Approve(long reviewerUserId, string? note, DateTime reviewedAtUtc)
        {
            if (Status != LoanApplicationStatus.UnderReview)
                throw new DomainException($"Cannot approve: application is {Status}. Move to UnderReview first.");
            Status = LoanApplicationStatus.Approved;
            ReviewedByUserId = reviewerUserId;
            ReviewedAtUtc = DateTime.SpecifyKind(reviewedAtUtc, DateTimeKind.Utc);
            AdminNote = note?.Trim();
        }

        public void Reject(long reviewerUserId, string? note, DateTime reviewedAtUtc)
        {
            if (Status != LoanApplicationStatus.UnderReview)
                throw new DomainException($"Cannot reject: application is {Status}. Move to UnderReview first.");
            Status = LoanApplicationStatus.Rejected;
            ReviewedByUserId = reviewerUserId;
            ReviewedAtUtc = DateTime.SpecifyKind(reviewedAtUtc, DateTimeKind.Utc);
            AdminNote = note?.Trim();
        }

        public void Disburse(DateTime disbursedAtUtc)
        {
            if (Status != LoanApplicationStatus.Approved)
                throw new DomainException($"Cannot disburse: application is {Status}. Must be Approved first.");
            Status = LoanApplicationStatus.Disbursed;
            ReviewedAtUtc = DateTime.SpecifyKind(disbursedAtUtc, DateTimeKind.Utc);
        }

        private static decimal GetDailyInterestRate(decimal amount) =>
            amount > 100000m ? 0.0088m : 0.009m;
    }
}
