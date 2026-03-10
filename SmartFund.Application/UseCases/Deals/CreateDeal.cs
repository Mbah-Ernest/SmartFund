using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Application.UseCases.Deals
{
    public sealed class CreateDeal
    {
        private readonly IDealRepository _repo;

        public CreateDeal(IDealRepository repo) => _repo = repo;

        // Business policy: minimum effective monthly ROI required for every new deal.
        private const decimal MinEffectiveMonthlyRoi = 0.20m;

        public async Task<long> ExecuteAsync(
            string dealCode,
            string title,
            string borrowerName,
            decimal loanAmount,
            decimal interestRate,
            int tenureMonths,
            DateTime utcNow,
            CancellationToken ct)
        {
            // Treat interestRate as total ROI over the full tenure.
            // effectiveMonthly = (1 + totalRoi)^(1/tenureMonths) - 1
            if (tenureMonths > 0)
            {
                var effectiveMonthly = CalculateEffectiveMonthlyRoi(interestRate, tenureMonths);
                if (effectiveMonthly < MinEffectiveMonthlyRoi)
                {
                    throw new DomainException(
                        $"Deal expected monthly ROI ({effectiveMonthly:P2}) is below minimum ({MinEffectiveMonthlyRoi:P0}).");
                }
            }

            var deal = Deal.Create(dealCode, title, borrowerName, loanAmount, interestRate, tenureMonths, utcNow);

            await _repo.AddAsync(deal, ct);
            await _repo.SaveChangesAsync(ct);

            return deal.Id;
        }

        private static decimal CalculateEffectiveMonthlyRoi(decimal totalRoi, int tenureMonths)
        {
            if (tenureMonths <= 0) return 0m;
            if (totalRoi <= -1m) return -1m;

            var monthly = Math.Pow(1d + (double)totalRoi, 1d / tenureMonths) - 1d;
            return (decimal)monthly;
        }
    }
}
