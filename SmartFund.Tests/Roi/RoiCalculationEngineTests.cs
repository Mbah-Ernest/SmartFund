using FluentAssertions;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Services;

namespace SmartFund.Tests.Roi;

public sealed class RoiCalculationEngineTests
{
    [Fact]
    public void Calculate_UsesCorrectCalculator_ForRoiType()
    {
        var engine = RoiCalculationEngine.Default();

        var result = engine.Calculate(
            principal: 1000m,
            rate: 0.10m,
            startDate: new DateTime(2026, 1, 1),
            maturityDate: new DateTime(2027, 1, 1),
            roiType: RoiType.SimpleInterest);

        result.TotalPayable.Should().Be(1100m);
        result.InterestAmount.Should().Be(100m);
    }
}
