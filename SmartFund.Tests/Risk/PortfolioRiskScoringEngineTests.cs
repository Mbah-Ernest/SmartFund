using FluentAssertions;
using SmartFund.Domain.Services;

namespace SmartFund.Tests.Risk;

public sealed class PortfolioRiskScoringEngineTests
{
    [Fact]
    public void Evaluate_HigherCoverage_ReducesRiskScore()
    {
        var engine = new PortfolioRiskScoringEngine();

        var lowCoverage = engine.Evaluate(new PortfolioRiskInput(
            TotalInvestorExposure: 50_000_000m,
            InsuranceCoverage: 0.02m,
            DealConcentration: 0.5m,
            InvestorConcentration: 0.4m));

        var higherCoverage = engine.Evaluate(new PortfolioRiskInput(
            TotalInvestorExposure: 50_000_000m,
            InsuranceCoverage: 0.25m,
            DealConcentration: 0.5m,
            InvestorConcentration: 0.4m));

        higherCoverage.RiskScore.Should().BeLessThan(lowCoverage.RiskScore);
    }

    [Fact]
    public void Evaluate_HigherConcentration_IncreasesRecommendedBuffer()
    {
        var engine = new PortfolioRiskScoringEngine();

        var diversified = engine.Evaluate(new PortfolioRiskInput(
            TotalInvestorExposure: 10_000_000m,
            InsuranceCoverage: 0.10m,
            DealConcentration: 0.1m,
            InvestorConcentration: 0.1m));

        var concentrated = engine.Evaluate(new PortfolioRiskInput(
            TotalInvestorExposure: 10_000_000m,
            InsuranceCoverage: 0.10m,
            DealConcentration: 0.9m,
            InvestorConcentration: 0.9m));

        concentrated.RecommendedInsuranceBuffer.Should().BeGreaterThan(diversified.RecommendedInsuranceBuffer);
        concentrated.RecommendedInsuranceCoverage.Should().BeGreaterThan(diversified.RecommendedInsuranceCoverage);
    }
}
