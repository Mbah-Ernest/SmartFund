using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.Services;

namespace SmartFund.Application.UseCases.Tranches
{
    public sealed class CreateTranche
    {
        private readonly ITrancheRepository _trancheRepo;
        private readonly ILedgerAccountRepository _accountRepo;
        private readonly ITrancheCodeGenerator _codeGenerator;
        private readonly IInvestorRepository _investorRepo;
        private readonly IDealRepository _dealRepo;
        private readonly IAuditService _audit;

        public CreateTranche(
            ITrancheRepository trancheRepo,
            ILedgerAccountRepository accountRepo,
            ITrancheCodeGenerator codeGenerator,
            IInvestorRepository investorRepo,
            IDealRepository dealRepo,
            IAuditService audit)
        {
            _trancheRepo = trancheRepo;
            _accountRepo = accountRepo;
            _codeGenerator = codeGenerator;
            _investorRepo = investorRepo;
            _dealRepo = dealRepo;
            _audit = audit;
        }

        public async Task<(long TrancheId, string TrancheCode, long LiabilityAccountId)> ExecuteAsync(
            long investorId,
            long? dealId,
            decimal principal,
            RoiType roiType,
            decimal roiRate,
            DateTime startDate,
            DateTime maturityDate,
            PayoutType payoutType,
            int? noticeDays,
            EarlyWithdrawalPolicy earlyWithdrawalPolicy,
            DateTime utcNow,
            CancellationToken ct)
        {
            var investor = await _investorRepo.GetByIdAsync(investorId, ct);
            if (investor is null)
                throw new DomainException("Investor not found.");

            if (investor.Status != InvestorStatus.Active)
                throw new DomainException("Investor is inactive.");

            if (!dealId.HasValue)
                throw new DomainException("DealId is required.");

            var deal = await _dealRepo.GetByIdAsync(dealId.Value, ct);
            if (deal is null)
                throw new DomainException("Deal not found.");

            if (deal.Status != DealStatus.Active)
                throw new DomainException("Deal is closed; cannot create new tranche.");

            // Logical constraint: you cannot promise a tranche maturity earlier than the underlying deal maturity
            // unless you model a liquidity facility (not yet in this codebase).
            var dealStart = deal.CreatedAtUtc.Date;
            var dealMaturity = dealStart.AddMonths(deal.TenureMonths);
            if (maturityDate.Date < dealMaturity)
                throw new DomainException("Tranche maturity cannot be earlier than deal maturity.");

            // Capacity rule: total outstanding tranches for this deal cannot exceed the deal loan amount.
            var outstanding = await _trancheRepo.GetOutstandingPrincipalByDealIdAsync(deal.Id, utcNow, ct);
            if (outstanding + principal > deal.LoanAmount)
            {
                var remaining = deal.LoanAmount - outstanding;
                if (remaining < 0) remaining = 0;
                throw new DomainException($"Deal capacity exceeded. Remaining capacity: {remaining:N2}.");
            }

            // Pricing rule: do not allow tranches to promise higher effective monthly ROI than the deal implies
            // (unless you later introduce an explicit subsidy / liquidity facility).
            var dealMonthly = CalculateEffectiveMonthlyRoi(deal.InterestRate, deal.TenureMonths);

            var roiEngine = RoiCalculationEngine.Default();
            var trancheCalc = roiEngine.Calculate(principal, roiRate, startDate, maturityDate, roiType);
            var trancheTotalRoi = principal <= 0 ? 0m : (trancheCalc.TotalPayable / principal) - 1m;
            var trancheMonths = CalculateMonthsFraction(startDate, maturityDate);
            var trancheMonthly = CalculateEffectiveMonthlyRoi(trancheTotalRoi, trancheMonths);

            if (trancheMonthly > dealMonthly + 0.0001m)
                throw new DomainException("Tranche ROI exceeds deal ROI; subsidy required.");

            // Generate unique tranche code
            var trancheCode = await _codeGenerator.NextAsync(utcNow, ct);

            // Create tranche domain entity
            var tranche = Tranche.Create(
                trancheCode,
                investorId,
                dealId,
                principal,
                roiType,
                roiRate,
                startDate,
                maturityDate,
                payoutType,
                noticeDays,
                earlyWithdrawalPolicy);

            // Create liability ledger account for this tranche
            var liabilityAccount = LedgerAccount.Create(
                $"Investor Liability - {trancheCode}",
                AccountType.Liability,
                ReferenceType.Tranche,
                referenceId: null);

            await _accountRepo.AddAsync(liabilityAccount, ct);
            await _accountRepo.SaveChangesAsync(ct);

            // Link the liability account to the tranche
            tranche.SetLiabilityAccount(liabilityAccount.Id);

            // Save the tranche
            await _trancheRepo.AddAsync(tranche, ct);
            await _trancheRepo.SaveChangesAsync(ct);

            await _audit.RecordAsync(
                AuditCategory.InvestmentManagement,
                "Create Tranche",
                $"Created tranche {trancheCode} for investor #{investorId} — Principal: {principal:N2} NGN",
                null,
                ct);

            return (tranche.Id, trancheCode, liabilityAccount.Id);
        }

        private static decimal CalculateEffectiveMonthlyRoi(decimal totalRoi, decimal tenureMonths)
        {
            if (tenureMonths <= 0m) return 0m;
            if (totalRoi <= -1m) return -1m;

            var monthly = Math.Pow(1d + (double)totalRoi, 1d / (double)tenureMonths) - 1d;
            return (decimal)monthly;
        }

        private static decimal CalculateMonthsFraction(DateTime startDate, DateTime maturityDate)
        {
            var days = (maturityDate.Date - startDate.Date).TotalDays;
            // Use a simple 30-day month approximation to avoid complicated day-of-month edge cases.
            var months = (decimal)days / 30m;
            return months <= 0m ? 0m : months;
        }

        public async Task ExecuteAsync(long investorId, decimal principal, RoiType roiType, decimal roiRate, DateTime startDate, DateTime maturityDate, PayoutType payoutType, int? noticeDays, EarlyWithdrawalPolicy earlyWithdrawalPolicy, CancellationToken ct)
        {
            throw new NotImplementedException();
        }
    }
}