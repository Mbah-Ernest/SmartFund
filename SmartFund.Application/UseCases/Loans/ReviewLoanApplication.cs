using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Application.UseCases.Loans
{
    public sealed class ReviewLoanApplication
    {
        private readonly ILoanApplicationRepository _repo;

        public ReviewLoanApplication(ILoanApplicationRepository repo) => _repo = repo;

        public async Task StartReviewAsync(long applicationId, CancellationToken ct)
        {
            var application = await _repo.GetByIdAsync(applicationId, ct)
                ?? throw new DomainException("Loan application not found.");

            application.StartReview();
            await _repo.SaveChangesAsync(ct);
        }

        public async Task ApproveAsync(long applicationId, long reviewerUserId, string? note, CancellationToken ct)
        {
            var application = await _repo.GetByIdAsync(applicationId, ct)
                ?? throw new DomainException("Loan application not found.");

            application.Approve(reviewerUserId, note, DateTime.UtcNow);
            await _repo.SaveChangesAsync(ct);
        }

        public async Task RejectAsync(long applicationId, long reviewerUserId, string? note, CancellationToken ct)
        {
            var application = await _repo.GetByIdAsync(applicationId, ct)
                ?? throw new DomainException("Loan application not found.");

            application.Reject(reviewerUserId, note, DateTime.UtcNow);
            await _repo.SaveChangesAsync(ct);
        }
    }
}
