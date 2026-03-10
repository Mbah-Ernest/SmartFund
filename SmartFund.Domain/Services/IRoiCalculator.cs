using System;
using SmartFund.Domain.Enums;

namespace SmartFund.Domain.Services
{
    public interface IRoiCalculator
    {
        RoiType RoiType { get; }

        RoiCalculationResult Calculate(decimal principal, decimal rate, DateTime startDate, DateTime maturityDate);
    }
}
