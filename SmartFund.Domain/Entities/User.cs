using System;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Entities
{
    public sealed class User
    {
        public long Id { get; private set; }
        public string Email { get; private set; } = default!;
        public string PasswordHash { get; private set; } = default!;
        public string FullName { get; private set; } = default!;
        public UserRole Role { get; private set; }
        public DateTime CreatedAtUtc { get; private set; }
        public bool IsActive { get; private set; }

        private User() { } // EF

        private User(string fullName, string email, string passwordHash, UserRole role, DateTime createdAtUtc)
        {
            if (string.IsNullOrWhiteSpace(fullName))
                throw new DomainException("Full name is required.");
            if (string.IsNullOrWhiteSpace(email))
                throw new DomainException("Email is required.");
            if (string.IsNullOrWhiteSpace(passwordHash))
                throw new DomainException("Password hash is required.");

            FullName = fullName.Trim();
            Email = email.Trim().ToLowerInvariant();
            PasswordHash = passwordHash;
            Role = role;
            CreatedAtUtc = DateTime.SpecifyKind(createdAtUtc, DateTimeKind.Utc);
            IsActive = true;
        }

        public static User Create(string fullName, string email, string passwordHash, UserRole role, DateTime createdAtUtc) =>
            new User(fullName, email, passwordHash, role, createdAtUtc);

        public void Deactivate()
        {
            if (!IsActive)
                throw new DomainException("User is already inactive.");
            IsActive = false;
        }

        public void UpdatePasswordHash(string hash)
        {
            if (string.IsNullOrWhiteSpace(hash))
                throw new DomainException("Password hash is required.");
            PasswordHash = hash;
        }
    }
}
