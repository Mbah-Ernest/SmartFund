using FluentAssertions;
using SmartFund.Domain.Services;

namespace SmartFund.Tests.Roi;

public sealed class CompoundInterestRoiCalculatorTests
{
    [Fact]
    public void Calculate_CompoundInterest_TwoYears_ReturnsExpectedAmounts()
    {
        var calc = new CompoundInterestRoiCalculator();

        var result = calc.Calculate(
            principal: 1000m,
            rate: 0.10m,
            startDate: new DateTime(2026, 1, 1),
            maturityDate: new DateTime(2028, 1, 1));

        // 1000 * 1.1^2 = 1210
        result.TotalPayable.Should().Be(1210m);
        result.InterestAmount.Should().Be(210m);
    }
}
