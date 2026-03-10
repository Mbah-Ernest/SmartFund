using System;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Entities
{
    public sealed class Deal
    {
        public long Id { get; private set; } // EF

        public string DealCode { get; private set; } = default!;
        public string Title { get; private set; } = default!;
        public string BorrowerName { get; private set; } = default!;

        public decimal LoanAmount { get; private set; }
        public decimal InterestRate { get; private set; }
        public int TenureMonths { get; private set; }

        public DealStatus Status { get; private set; }
        public DateTime CreatedAtUtc { get; private set; }

        private Deal() { } // EF

        private Deal(
            string dealCode,
            string title,
            string borrowerName,
            decimal loanAmount,
            decimal interestRate,
            int tenureMonths,
            DealStatus status,
            DateTime createdAtUtc)
        {
            if (string.IsNullOrWhiteSpace(dealCode))
                throw new DomainException("DealCode is required.");

            if (string.IsNullOrWhiteSpace(title))
                throw new DomainException("Title is required.");

            if (string.IsNullOrWhiteSpace(borrowerName))
                throw new DomainException("BorrowerName is required.");

            if (loanAmount <= 0)
                throw new DomainException("LoanAmount must be greater than zero.");

            if (interestRate < 0)
                throw new DomainException("InterestRate cannot be negative.");

            if (tenureMonths <= 0)
                throw new DomainException("TenureMonths must be greater than zero.");

            DealCode = dealCode.Trim();
            Title = title.Trim();
            BorrowerName = borrowerName.Trim();
            LoanAmount = decimal.Round(loanAmount, 2);
            InterestRate = interestRate;
            TenureMonths = tenureMonths;
            Status = status;
            CreatedAtUtc = DateTime.SpecifyKind(createdAtUtc, DateTimeKind.Utc);
        }

        public static Deal Create(
            string dealCode,
            string title,
            string borrowerName,
            decimal loanAmount,
            decimal interestRate,
            int tenureMonths,
            DateTime createdAtUtc)
            => new Deal(dealCode, title, borrowerName, loanAmount, interestRate, tenureMonths, DealStatus.Active, createdAtUtc);

        public void Close() => Status = DealStatus.Closed;

        public void Activate() => Status = DealStatus.Active;
    }
}
