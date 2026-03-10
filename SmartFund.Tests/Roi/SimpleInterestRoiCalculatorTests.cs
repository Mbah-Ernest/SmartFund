using FluentAssertions;
using SmartFund.Domain.Services;

namespace SmartFund.Tests.Roi;

public sealed class SimpleInterestRoiCalculatorTests
{
    [Fact]
    public void Calculate_SimpleInterest_OneYear_ReturnsExpectedAmounts()
    {
        var calc = new SimpleInterestRoiCalculator();

        var result = calc.Calculate(
            principal: 1000m,
            rate: 0.10m,
            startDate: new DateTime(2026, 1, 1),
            maturityDate: new DateTime(2027, 1, 1));

        result.InterestAmount.Should().Be(100m);
        result.TotalPayable.Should().Be(1100m);
    }
}
