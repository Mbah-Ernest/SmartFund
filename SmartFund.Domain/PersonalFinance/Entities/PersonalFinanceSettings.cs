using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    /// <summary>Per-user settings row for the personal finance module (one row per user).</summary>
    public sealed class PersonalFinanceSettings
    {
        public long Id { get; private set; }

        public long UserId { get; private set; }

        /// <summary>Earliest date used as the sync backfill floor for first-time bank sync.</summary>
        public DateTime LaunchDateUtc { get; private set; }

        public DateTime CreatedAtUtc { get; private set; }
        public DateTime UpdatedAtUtc { get; private set; }
        public DateTime? LastResetAtUtc { get; private set; }

        private PersonalFinanceSettings() { } // EF

        public static PersonalFinanceSettings Create(long userId, DateTime launchDateUtc, DateTime utcNow)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            return new PersonalFinanceSettings
            {
                UserId = userId,
                LaunchDateUtc = DateTime.SpecifyKind(launchDateUtc.Date, DateTimeKind.Utc),
                CreatedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc),
                UpdatedAtUtc = DateTime.SpecifyKind(utcNow, DateTimeKind.Utc),
            };
        }

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
