using System;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.Services
{
    public sealed class SimpleInterestRoiCalculator : IRoiCalculator
    {
        public RoiType RoiType => RoiType.SimpleInterest;

        public RoiCalculationResult Calculate(decimal principal, decimal rate, DateTime startDate, DateTime maturityDate)
        {
            Validate(principal, rate, startDate, maturityDate);

            var years = GetYearsFraction(startDate, maturityDate);

            var interest = decimal.Round(principal * rate * years, 2);
            var total = decimal.Round(principal + interest, 2);

            return new RoiCalculationResult(interest, total);
        }

        private static decimal GetYearsFraction(DateTime startDate, DateTime maturityDate)
        {
            var days = (maturityDate.Date - startDate.Date).TotalDays;
            return (decimal)days / 365m;
        }

        private static void Validate(decimal principal, decimal rate, DateTime startDate, DateTime maturityDate)
        {
            if (principal <= 0) throw new DomainException("Principal must be greater than zero.");
            if (rate < 0) throw new DomainException("Rate cannot be negative.");
            if (maturityDate <= startDate) throw new DomainException("MaturityDate must be after StartDate.");
        }
    }
}
