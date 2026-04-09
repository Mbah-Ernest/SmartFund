using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Application.Services
{
    public sealed class UserAuthService
    {
        private readonly IUserRepository _userRepo;
        private readonly IPasswordHasher _hasher;

        public UserAuthService(IUserRepository userRepo, IPasswordHasher hasher)
        {
            _userRepo = userRepo;
            _hasher = hasher;
        }

        public async Task<User> RegisterAsync(
            string fullName, string email, string password, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(fullName))
                throw new DomainException("Full name is required.");
            if (string.IsNullOrWhiteSpace(email))
                throw new DomainException("Email is required.");
            if (string.IsNullOrWhiteSpace(password) || password.Length < 6)
                throw new DomainException("Password must be at least 6 characters.");

            var normalizedEmail = email.Trim().ToLowerInvariant();
            var existing = await _userRepo.GetByEmailAsync(normalizedEmail, ct);
            if (existing is not null)
                throw new DomainException("An account with this email already exists.");

            var hash = _hasher.Hash(password);
            var user = User.Create(fullName.Trim(), normalizedEmail, hash, UserRole.Member, DateTime.UtcNow);

            await _userRepo.AddAsync(user, ct);
            await _userRepo.SaveChangesAsync(ct);

            return user;
        }

        public async Task<User?> AuthenticateAsync(string email, string password, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
                return null;

            var normalizedEmail = email.Trim().ToLowerInvariant();
            var user = await _userRepo.GetByEmailAsync(normalizedEmail, ct);
            if (user is null || !user.IsActive)
                return null;

            return _hasher.Verify(password, user.PasswordHash) ? user : null;
        }

        public async Task<bool> VerifyPasswordAsync(long userId, string password, CancellationToken ct)
        {
            if (userId <= 0 || string.IsNullOrWhiteSpace(password))
                return false;

            var user = await _userRepo.GetByIdAsync(userId, ct);
            if (user is null || !user.IsActive)
                return false;

            return _hasher.Verify(password, user.PasswordHash);
        }
    }
}
