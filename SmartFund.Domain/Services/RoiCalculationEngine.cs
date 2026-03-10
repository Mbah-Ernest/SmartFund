using System;
using System.Collections.Generic;
using System.Linq;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Services
{
    public sealed class RoiCalculationEngine
    {
        private readonly IReadOnlyDictionary<RoiType, IRoiCalculator> _calculators;

        public RoiCalculationEngine(IEnumerable<IRoiCalculator> calculators)
        {
            _calculators = calculators.ToDictionary(x => x.RoiType);
        }

        public static RoiCalculationEngine Default() => new RoiCalculationEngine(new IRoiCalculator[]
        {
            new FlatRoiCalculator(),
            new SimpleInterestRoiCalculator(),
            new CompoundInterestRoiCalculator()
        });

        public RoiCalculationResult Calculate(
            decimal principal,
            decimal rate,
            DateTime startDate,
            DateTime maturityDate,
            RoiType roiType)
        {
            if (!_calculators.TryGetValue(roiType, out var calc))
                throw new DomainException($"No ROI calculator registered for {roiType}.");

            return calc.Calculate(principal, rate, startDate, maturityDate);
        }
    }
}
