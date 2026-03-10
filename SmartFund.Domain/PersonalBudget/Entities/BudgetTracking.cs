using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.PersonalBudget.Entities
{
    public sealed class BudgetTracking
    {
        public long BudgetId { get; private set; }

        public int Year { get; private set; }
        public int Month { get; private set; }

        public decimal SpentAmount { get; private set; }
        public decimal RemainingAmount { get; private set; }

        private BudgetTracking() { } // EF

        private BudgetTracking(long budgetId, int year, int month, decimal spentAmount, decimal remainingAmount)
        {
            if (budgetId <= 0)
                throw new DomainException("BudgetId must be a positive value.");

            if (year <= 0)
                throw new DomainException("Year must be valid.");

            if (month is < 1 or > 12)
                throw new DomainException("Month must be between 1 and 12.");

            BudgetId = budgetId;
            Year = year;
            Month = month;
            SpentAmount = decimal.Round(spentAmount, 2);
            RemainingAmount = decimal.Round(remainingAmount, 2);
        }

        public static BudgetTracking CreateForPeriod(long budgetId, int year, int month, decimal budgetAmount) =>
            new BudgetTracking(budgetId, year, month, spentAmount: 0m, remainingAmount: decimal.Round(budgetAmount, 2));

        public void ApplyExpense(decimal amount, decimal budgetAmount)
        {
            if (amount <= 0)
                throw new DomainException("Amount must be greater than zero.");

            SpentAmount = decimal.Round(SpentAmount + amount, 2);
            RemainingAmount = decimal.Round(decimal.Round(budgetAmount, 2) - SpentAmount, 2);
        }

        public bool IsOverBudget() => RemainingAmount < 0m;
    }
}
