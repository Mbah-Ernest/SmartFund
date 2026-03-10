using System;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Entities
{
    public sealed class Investor
    {
        public long Id { get; private set; } // EF

        public string FullName { get; private set; } = default!;
        public string Email { get; private set; } = default!;
        public string? Phone { get; private set; }
        public InvestorStatus Status { get; private set; }
        public DateTime CreatedAtUtc { get; private set; }

        private Investor() { } // EF

        private Investor(string fullName, string email, string? phone, InvestorStatus status, DateTime createdAtUtc)
        {
            if (string.IsNullOrWhiteSpace(fullName))
                throw new DomainException("FullName is required.");

            if (string.IsNullOrWhiteSpace(email))
                throw new DomainException("Email is required.");

            FullName = fullName.Trim();
            Email = email.Trim();
            Phone = string.IsNullOrWhiteSpace(phone) ? null : phone.Trim();
            Status = status;
            CreatedAtUtc = DateTime.SpecifyKind(createdAtUtc, DateTimeKind.Utc);
        }

        public static Investor Create(string fullName, string email, string? phone, DateTime createdAtUtc)
            => new Investor(fullName, email, phone, InvestorStatus.Active, createdAtUtc);

        public void Deactivate()
        {
            Status = InvestorStatus.Inactive;
        }

        public void Activate()
        {
            Status = InvestorStatus.Active;
        }
    }
}
