using System;

namespace SmartFund.Domain.Services
{
    public sealed class PortfolioRiskScoringEngine
    {
        public PortfolioRiskResult Evaluate(PortfolioRiskInput input)
        {
            input.Validate();

            // The scoring model expects:
            // - InsuranceCoverage: insurance reserve / total exposure (ratio)
            // - Concentrations: 0..1 (higher means more concentrated and riskier)

            var recommendedCoverage = GetRecommendedCoverageRatio(
                dealConcentration: input.DealConcentration,
                investorConcentration: input.InvestorConcentration);

            var riskScore = CalculateRiskScore(
                totalExposure: input.TotalInvestorExposure,
                insuranceCoverage: input.InsuranceCoverage,
                recommendedCoverage: recommendedCoverage,
                dealConcentration: input.DealConcentration,
                investorConcentration: input.InvestorConcentration);

            var recommendedBuffer = decimal.Round(input.TotalInvestorExposure * recommendedCoverage, 2);

            return new PortfolioRiskResult(
                RiskScore: riskScore,
                RecommendedInsuranceBuffer: recommendedBuffer,
                RecommendedInsuranceCoverage: recommendedCoverage);
        }

        private static int CalculateRiskScore(
            decimal totalExposure,
            decimal insuranceCoverage,
            decimal recommendedCoverage,
            decimal dealConcentration,
            decimal investorConcentration)
        {
            // Coverage shortfall drives the bulk of the risk score.
            var shortfallRatio = recommendedCoverage <= 0m
                ? 0m
                : Math.Clamp((recommendedCoverage - insuranceCoverage) / recommendedCoverage, 0m, 1m);

            var coverageRisk = 50m * shortfallRatio;
            var dealConcRisk = 25m * Math.Clamp(dealConcentration, 0m, 1m);
            var investorConcRisk = 15m * Math.Clamp(investorConcentration, 0m, 1m);

            // Exposure adds a small absolute-risk bump.
            var exposureRisk = totalExposure switch
            {
                >= 100_000_000m => 10m,
                >= 10_000_000m => 5m,
                _ => 0m
            };

            var total = coverageRisk + dealConcRisk + investorConcRisk + exposureRisk;
            total = Math.Clamp(total, 0m, 100m);

            return (int)Math.Round(total, MidpointRounding.AwayFromZero);
        }

        private static decimal GetRecommendedCoverageRatio(decimal dealConcentration, decimal investorConcentration)
        {
            // Baseline buffer + add-ons for concentration.
            var baseCoverage = 0.10m;

            var dealAdd = 0.15m * Math.Clamp(dealConcentration, 0m, 1m);
            var investorAdd = 0.10m * Math.Clamp(investorConcentration, 0m, 1m);

            var recommended = baseCoverage + dealAdd + investorAdd;

            // Keep within a sane range.
            return Math.Clamp(recommended, 0.05m, 0.50m);
        }
    }
}
