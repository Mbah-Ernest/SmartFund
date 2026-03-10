using SmartFund.Domain.PersonalBudget.Enums;

namespace SmartFund.API.Contracts.PersonalBudget
{
    public sealed class CreatePersonalBudgetRequest
    {
        public long CategoryId { get; set; }
        public decimal Amount { get; set; }
        public BudgetPeriod Period { get; set; } = BudgetPeriod.Monthly;
    }
}
