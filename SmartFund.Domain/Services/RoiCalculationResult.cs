namespace SmartFund.Domain.Services
{
    public readonly record struct RoiCalculationResult(decimal InterestAmount, decimal TotalPayable);
}
