using SmartFund.Domain.PersonalBudget.Enums;

namespace SmartFund.API.Contracts.PersonalBudget
{
    public sealed class BudgetDto
    {
        public long Id { get; set; }
        public long CategoryId { get; set; }
        public decimal Amount { get; set; }
        public BudgetPeriod Period { get; set; }
    }
}
