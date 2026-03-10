using System;

namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class PersonalGoalDto
    {
        public long Id { get; set; }
        public string Name { get; set; } = default!;
        public decimal TargetAmount { get; set; }
        public decimal SavedAmount { get; set; }
        public DateTime Deadline { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
