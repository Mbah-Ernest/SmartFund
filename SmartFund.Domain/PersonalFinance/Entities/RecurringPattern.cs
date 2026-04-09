using System;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class RecurringPattern
    {
        public long Id { get; private set; }
        public long UserId { get; private set; }
        public string Description { get; private set; } = default!;
        public decimal AverageAmount { get; private set; }
        public string Frequency { get; private set; } = default!;
        public string Category { get; private set; } = default!;
        public RecurringPatternType PatternType { get; private set; }
        public DateTime FirstSeen { get; private set; }
        public DateTime LastSeen { get; private set; }
        public int OccurrenceCount { get; private set; }
        public DateTime DetectedAtUtc { get; private set; }

        private RecurringPattern() { }

        public static RecurringPattern Create(
            long userId,
            string description,
            decimal averageAmount,
            string frequency,
            string category,
            RecurringPatternType patternType,
            DateTime firstSeen,
            DateTime lastSeen,
            int occurrenceCount,
            DateTime detectedAtUtc)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            if (string.IsNullOrWhiteSpace(description))
                throw new DomainException("Description is required.");
            if (averageAmount <= 0)
                throw new DomainException("AverageAmount must be greater than zero.");
            if (occurrenceCount < 3)
                throw new DomainException("OccurrenceCount must be at least 3 to qualify as a pattern.");

            return new RecurringPattern
            {
                UserId = userId,
                Description = description.Trim(),
                AverageAmount = decimal.Round(averageAmount, 2),
                Frequency = string.IsNullOrWhiteSpace(frequency) ? "irregular" : frequency.Trim().ToLowerInvariant(),
                Category = string.IsNullOrWhiteSpace(category) ? "other" : category.Trim(),
                PatternType = patternType,
                FirstSeen = DateTime.SpecifyKind(firstSeen.Date, DateTimeKind.Unspecified),
                LastSeen = DateTime.SpecifyKind(lastSeen.Date, DateTimeKind.Unspecified),
                OccurrenceCount = occurrenceCount,
                DetectedAtUtc = DateTime.SpecifyKind(detectedAtUtc, DateTimeKind.Utc)
            };
        }

        public void UpdateStats(decimal averageAmount, DateTime lastSeen, int occurrenceCount, DateTime detectedAtUtc)
        {
            AverageAmount = decimal.Round(averageAmount, 2);
            LastSeen = DateTime.SpecifyKind(lastSeen.Date, DateTimeKind.Unspecified);
            OccurrenceCount = occurrenceCount;
            DetectedAtUtc = DateTime.SpecifyKind(detectedAtUtc, DateTimeKind.Utc);
        }
    }
}
