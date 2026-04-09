using System;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Entities
{
    public sealed class LoanApplicantProfile
    {
        public long Id { get; private set; }
        public long UserId { get; private set; }
        public string SubmittedName { get; private set; } = default!;
        public string? FullName { get; private set; }
        public string? PhoneNumber { get; private set; }
        public string? EmailAddress { get; private set; }
        public string? EmergencyContactNumber { get; private set; }
        public LoanApplicantStatus Status { get; private set; }
        public DateTime SubmittedAtUtc { get; private set; }
        public DateTime? ReviewedAtUtc { get; private set; }
        public long? ReviewedByUserId { get; private set; }
        public string? AdminNote { get; private set; }

        private LoanApplicantProfile() { }

        private LoanApplicantProfile(long userId, string submittedName, DateTime submittedAtUtc)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            if (string.IsNullOrWhiteSpace(submittedName))
                throw new DomainException("Full name is required.");

            UserId = userId;
            SubmittedName = submittedName.Trim();
            Status = LoanApplicantStatus.Pending;
            SubmittedAtUtc = DateTime.SpecifyKind(submittedAtUtc, DateTimeKind.Utc);
        }

        public static LoanApplicantProfile Submit(long userId, string submittedName, DateTime submittedAtUtc) =>
            new LoanApplicantProfile(userId, submittedName, submittedAtUtc);

        public void Verify(long reviewerUserId, string fullName, string phoneNumber, string emailAddress,
            string emergencyContactNumber, string? note, DateTime reviewedAtUtc)
        {
            if (Status != LoanApplicantStatus.Pending)
                throw new DomainException($"Cannot verify: application is {Status}.");
            if (string.IsNullOrWhiteSpace(fullName))
                throw new DomainException("Full name is required.");
            if (string.IsNullOrWhiteSpace(phoneNumber))
                throw new DomainException("Phone number is required.");
            if (string.IsNullOrWhiteSpace(emailAddress))
                throw new DomainException("Email address is required.");
            if (string.IsNullOrWhiteSpace(emergencyContactNumber))
                throw new DomainException("Emergency contact number is required.");

            FullName = fullName.Trim();
            PhoneNumber = phoneNumber.Trim();
            EmailAddress = emailAddress.Trim();
            EmergencyContactNumber = emergencyContactNumber.Trim();
            Status = LoanApplicantStatus.Verified;
            ReviewedByUserId = reviewerUserId;
            ReviewedAtUtc = DateTime.SpecifyKind(reviewedAtUtc, DateTimeKind.Utc);
            AdminNote = note?.Trim();
        }

        public void Reject(long reviewerUserId, string? note, DateTime reviewedAtUtc)
        {
            if (Status != LoanApplicantStatus.Pending)
                throw new DomainException($"Cannot reject: application is {Status}.");

            Status = LoanApplicantStatus.Rejected;
            ReviewedByUserId = reviewerUserId;
            ReviewedAtUtc = DateTime.SpecifyKind(reviewedAtUtc, DateTimeKind.Utc);
            AdminNote = note?.Trim();
        }
    }
}
