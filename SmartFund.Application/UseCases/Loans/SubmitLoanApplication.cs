using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;

namespace SmartFund.Application.UseCases.Loans
{
    public sealed class SubmitLoanApplication
    {
        private const decimal FirstTimeLoanLimit = 5000m;

        private readonly ILoanApplicationRepository _repo;
        private readonly ILoanApplicantProfileRepository _profileRepo;
        private readonly IConnectedBankAccountRepository _bankRepo;

        public SubmitLoanApplication(
            ILoanApplicationRepository repo,
            ILoanApplicantProfileRepository profileRepo,
            IConnectedBankAccountRepository bankRepo)
        {
            _repo = repo;
            _profileRepo = profileRepo;
            _bankRepo = bankRepo;
        }

        public async Task<LoanApplication> ExecuteAsync(
            long userId,
            decimal amount,
            LoanPurpose purposeCategory,
            string purposeDescription,
            int durationDays,
            int repaymentInstallments,
            string accountNumber,
            string bankName,
            string accountName,
            CancellationToken ct)
        {
            var profile = await _profileRepo.GetByUserIdAsync(userId, ct)
                ?? throw new Domain.Exceptions.DomainException("Loan profile not found. Submit your onboarding request first.");

            if (profile.Status != Domain.Enums.LoanApplicantStatus.Verified)
                throw new Domain.Exceptions.DomainException("Loan profile is not verified yet.");

            var priorLoans = await _repo.ListByUserAsync(userId, ct);
            var isFirstLoan = priorLoans.Count == 0;

            if (isFirstLoan && amount > FirstTimeLoanLimit)
                throw new Domain.Exceptions.DomainException($"First-time loan limit is ₦{FirstTimeLoanLimit:N0}.");

            if (amount > FirstTimeLoanLimit)
            {
                var linkedAccounts = await _bankRepo.ListByUserAsync(userId, ct);
                if (linkedAccounts.Count == 0)
                    throw new Domain.Exceptions.DomainException("Link at least one bank card to request more than ₦5,000.");
            }

            var application = LoanApplication.Submit(
                userId,
                amount,
                purposeCategory,
                purposeDescription ?? string.Empty,
                durationDays,
                repaymentInstallments,
                accountNumber,
                bankName,
                accountName,
                DateTime.UtcNow);

            await _repo.AddAsync(application, ct);
            await _repo.SaveChangesAsync(ct);

            return application;
        }
    }
}
