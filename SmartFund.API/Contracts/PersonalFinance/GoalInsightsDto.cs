using System;
using System.Collections.Generic;

namespace SmartFund.API.Contracts.PersonalFinance
{
    public sealed class GoalInsightsDto
    {
        public decimal TotalTargetNaira { get; set; }
        public decimal TotalSavedNaira { get; set; }
        public int GoalsOnTrack { get; set; }
        public int TotalActiveGoals { get; set; }
        public int OverdueGoals { get; set; }
        public decimal OverallProgressPct { get; set; }
        public long? NextDeadlineGoalId { get; set; }
        public string? NextDeadlineGoalName { get; set; }
        public DateTime? NextDeadline { get; set; }
        public List<GoalInsightItemDto> Items { get; set; } = new();
    }

    public sealed class GoalInsightItemDto
    {
        public long GoalId { get; set; }
        public string Name { get; set; } = default!;
        public decimal TargetNaira { get; set; }
        public decimal SavedNaira { get; set; }
        public decimal ProgressPct { get; set; }
        public decimal MonthlyRequiredNaira { get; set; }
        public DateTime? EstimatedCompletionDate { get; set; }
        public bool IsOnTrack { get; set; }
        public bool IsOverdue { get; set; }
        public bool IsWalletLinked { get; set; }
        public long? WalletId { get; set; }
    }
}
