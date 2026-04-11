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
        public long? WalletId { get; set; }
        public bool IsWalletLinked { get; set; }
        public decimal EffectiveSavedAmount { get; set; }
        public decimal ProgressPct { get; set; }
        public decimal RemainingAmount { get; set; }
    }
}
