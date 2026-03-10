namespace SmartFund.Domain.Services
{
    public readonly record struct PortfolioRiskResult(
        int RiskScore,
        decimal RecommendedInsuranceBuffer,
        decimal RecommendedInsuranceCoverage);
}
