using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Application.UseCases.Loans
{
    public sealed class DisburseLoanApplication
    {
        private readonly ILoanApplicationRepository _repo;

        public DisburseLoanApplication(ILoanApplicationRepository repo) => _repo = repo;

        public async Task ExecuteAsync(long applicationId, CancellationToken ct)
        {
            var application = await _repo.GetByIdAsync(applicationId, ct)
                ?? throw new DomainException("Loan application not found.");

            application.Disburse(DateTime.UtcNow);
            await _repo.SaveChangesAsync(ct);
        }
    }
}
