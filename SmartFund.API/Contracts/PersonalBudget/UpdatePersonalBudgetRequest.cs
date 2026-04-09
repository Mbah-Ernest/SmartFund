namespace SmartFund.API.Contracts.PersonalBudget
{
    public sealed class UpdatePersonalBudgetRequest
    {
        public long CategoryId { get; set; }
        public decimal Amount { get; set; }
        public int Period { get; set; } = 1; // BudgetPeriod.Monthly
    }
}
