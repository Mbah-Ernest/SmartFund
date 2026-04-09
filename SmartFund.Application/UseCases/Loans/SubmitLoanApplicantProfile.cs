using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Application.UseCases.Loans
{
    public sealed class SubmitLoanApplicantProfile
    {
        private readonly ILoanApplicantProfileRepository _repo;

        public SubmitLoanApplicantProfile(ILoanApplicantProfileRepository repo) => _repo = repo;

        public async Task<LoanApplicantProfile> ExecuteAsync(long userId, string fullName, CancellationToken ct)
        {
            var existing = await _repo.GetByUserIdAsync(userId, ct);
            if (existing is not null && existing.Status != Domain.Enums.LoanApplicantStatus.Rejected)
                throw new DomainException("Loan profile already submitted.");

            var profile = LoanApplicantProfile.Submit(userId, fullName, DateTime.UtcNow);
            await _repo.AddAsync(profile, ct);
            await _repo.SaveChangesAsync(ct);

            return profile;
        }
    }
}
