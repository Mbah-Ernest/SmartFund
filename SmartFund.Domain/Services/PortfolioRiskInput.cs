using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Services
{
    public readonly record struct PortfolioRiskInput(
        decimal TotalInvestorExposure,
        decimal InsuranceCoverage,
        decimal DealConcentration,
        decimal InvestorConcentration)
    {
        public void Validate()
        {
            if (TotalInvestorExposure < 0m)
                throw new DomainException("TotalInvestorExposure cannot be negative.");

            if (InsuranceCoverage < 0m)
                throw new DomainException("InsuranceCoverage cannot be negative.");

            if (DealConcentration is < 0m or > 1m)
                throw new DomainException("DealConcentration must be between 0 and 1.");

            if (InvestorConcentration is < 0m or > 1m)
                throw new DomainException("InvestorConcentration must be between 0 and 1.");
        }
    }
}
