using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalBudget.Enums;

namespace SmartFund.Domain.PersonalBudget.Entities
{
    public sealed class Budget
    {
        public long Id { get; private set; } // EF

        public long CategoryId { get; private set; }
        public decimal Amount { get; private set; }
        public BudgetPeriod Period { get; private set; }

        private Budget() { } // EF

        private Budget(long categoryId, decimal amount, BudgetPeriod period)
        {
            if (categoryId <= 0)
                throw new DomainException("CategoryId must be a positive value.");

            if (amount <= 0)
                throw new DomainException("Amount must be greater than zero.");

            CategoryId = categoryId;
            Amount = decimal.Round(amount, 2);
            Period = period;
        }

        public static Budget Create(long categoryId, decimal amount, BudgetPeriod period) =>
            new Budget(categoryId, amount, period);

        public void UpdateAmount(decimal amount)
        {
            if (amount <= 0)
                throw new DomainException("Amount must be greater than zero.");

            Amount = decimal.Round(amount, 2);
        }
    }
}
