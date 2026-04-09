using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Application.UseCases.Loans
{
    public sealed class ReviewLoanApplicantProfile
    {
        private readonly ILoanApplicantProfileRepository _repo;

        public ReviewLoanApplicantProfile(ILoanApplicantProfileRepository repo) => _repo = repo;

        public async Task VerifyAsync(long profileId, long reviewerUserId, string fullName, string phoneNumber,
            string emailAddress, string emergencyContactNumber, string? note, CancellationToken ct)
        {
            var profile = await _repo.GetByIdAsync(profileId, ct)
                ?? throw new DomainException("Loan profile not found.");

            profile.Verify(reviewerUserId, fullName, phoneNumber, emailAddress, emergencyContactNumber, note, DateTime.UtcNow);
            await _repo.SaveChangesAsync(ct);
        }

        public async Task RejectAsync(long profileId, long reviewerUserId, string? note, CancellationToken ct)
        {
            var profile = await _repo.GetByIdAsync(profileId, ct)
                ?? throw new DomainException("Loan profile not found.");

            profile.Reject(reviewerUserId, note, DateTime.UtcNow);
            await _repo.SaveChangesAsync(ct);
        }
    }
}
