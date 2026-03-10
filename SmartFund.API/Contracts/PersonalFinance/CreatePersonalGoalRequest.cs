using System;

namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class CreatePersonalGoalRequest
    {
        public string Name { get; set; } = default!;
        public decimal TargetAmount { get; set; }
        public DateTime Deadline { get; set; }
    }
}
