namespace SmartFund.API.Contracts.PersonalBudget
{
    public sealed class BudgetTrackingDto
    {
        public long BudgetId { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }
        public decimal SpentAmount { get; set; }
        public decimal RemainingAmount { get; set; }
        public bool IsOverBudget { get; set; }
    }
}
