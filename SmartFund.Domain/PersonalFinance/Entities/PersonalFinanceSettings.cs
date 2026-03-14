using System;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    /// <summary>Singleton settings row for the personal finance module (one row, Id = 1).</summary>
    public sealed class PersonalFinanceSettings
    {
        public int Id { get; private set; }

        /// <summary>Earliest date used as the sync backfill floor for first-time bank sync.</summary>
        public DateTime LaunchDateUtc { get; private set; }

        public DateTime CreatedAtUtc { get; private set; }
        public DateTime UpdatedAtUtc { get; private set; }
        public DateTime? LastResetAtUtc { get; private set; }

        private PersonalFinanceSettings() { } // EF

        public static PersonalFinanceSettings Create(DateTime launchDateUtc, DateTime utcNow) =>
            new PersonalFinanceSettings
            {
                LaunchDateUtc = DateTime.SpecifyKind(launchDateUtc.Date, DateTimeKind.Utc),
                CreatedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc),
                UpdatedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc),
            };

        public void UpdateLaunchDate(DateTime launchDateUtc, DateTime utcNow)
        {
            LaunchDateUtc = DateTime.SpecifyKind(launchDateUtc.Date, DateTimeKind.Utc);
            UpdatedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        }

        public void RecordReset(DateTime utcNow)
        {
            LastResetAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
            UpdatedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc);
        }
    }
}
