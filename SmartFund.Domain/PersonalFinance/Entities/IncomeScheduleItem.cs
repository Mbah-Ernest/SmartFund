using System;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class IncomeScheduleItem
    {
        public long Id { get; private set; }
        public long UserId { get; private set; }
        public string Label { get; private set; } = default!;
        public decimal Amount { get; private set; }
        public IncomeScheduleDirection Direction { get; private set; }
        public IncomeScheduleKind Kind { get; private set; }
        public IncomeRecurrenceInterval? RecurrenceInterval { get; private set; }
        public DateTime NextExpectedDate { get; private set; }
        public DateTime? EndDate { get; private set; }
        public string? Notes { get; private set; }
        public IncomeScheduleStatus Status { get; private set; }
        public DateTime CreatedAt { get; private set; }
        public DateTime? UpdatedAt { get; private set; }

        private IncomeScheduleItem() { } // EF

        private IncomeScheduleItem(
            long userId,
            string label,
            decimal amount,
            IncomeScheduleDirection direction,
            IncomeScheduleKind kind,
            DateTime nextExpectedDate,
            IncomeRecurrenceInterval? recurrenceInterval,
            DateTime? endDate,
            string? notes)
        {
            if (userId <= 0)
                throw new DomainException("UserId must be a positive value.");
            if (string.IsNullOrWhiteSpace(label))
                throw new DomainException("Label is required.");
            if (amount <= 0)
                throw new DomainException("Amount must be greater than zero.");
            if (!Enum.IsDefined(typeof(IncomeScheduleDirection), direction))
                throw new DomainException("Invalid schedule direction.");
            if (kind == IncomeScheduleKind.Recurring && recurrenceInterval == null)
                throw new DomainException("Recurring items require a recurrence interval.");
            if (kind == IncomeScheduleKind.OneTime && recurrenceInterval != null)
                throw new DomainException("One-time items cannot have recurrence interval.");
            if (kind == IncomeScheduleKind.OneTime && endDate != null)
                throw new DomainException("One-time items cannot have an end date.");

            var normalizedNextDate = DateTime.SpecifyKind(nextExpectedDate.Date, DateTimeKind.Utc);
            var normalizedEndDate = endDate.HasValue
                ? DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Utc)
                : (DateTime?)null;

            if (normalizedEndDate.HasValue && normalizedEndDate.Value < normalizedNextDate)
                throw new DomainException("End date cannot be earlier than next expected date.");

            UserId = userId;
            Label = label.Trim();
            Amount = decimal.Round(amount, 2);
            Direction = direction;
            Kind = kind;
            RecurrenceInterval = recurrenceInterval;
            NextExpectedDate = normalizedNextDate;
            EndDate = normalizedEndDate;
            Notes = notes?.Trim();
            Status = IncomeScheduleStatus.Active;
            CreatedAt = DateTime.UtcNow;
        }

        public static IncomeScheduleItem Create(
            long userId,
            string label,
            decimal amount,
            IncomeScheduleDirection direction,
            IncomeScheduleKind kind,
            DateTime nextExpectedDate,
            IncomeRecurrenceInterval? recurrenceInterval,
            DateTime? endDate,
            string? notes) =>
            new IncomeScheduleItem(userId, label, amount, direction, kind, nextExpectedDate, recurrenceInterval, endDate, notes);

        public void Update(
            string label,
            decimal amount,
            IncomeScheduleDirection direction,
            IncomeScheduleKind kind,
            IncomeRecurrenceInterval? recurrenceInterval,
            DateTime nextExpectedDate,
            DateTime? endDate,
            string? notes)
        {
            if (string.IsNullOrWhiteSpace(label))
                throw new DomainException("Label is required.");
            if (amount <= 0)
                throw new DomainException("Amount must be greater than zero.");
            if (!Enum.IsDefined(typeof(IncomeScheduleDirection), direction))
                throw new DomainException("Invalid schedule direction.");
            if (kind == IncomeScheduleKind.Recurring && recurrenceInterval == null)
                throw new DomainException("Recurring items require a recurrence interval.");
            if (kind == IncomeScheduleKind.OneTime && recurrenceInterval != null)
                throw new DomainException("One-time items cannot have recurrence interval.");
            if (kind == IncomeScheduleKind.OneTime && endDate != null)
                throw new DomainException("One-time items cannot have an end date.");

            var normalizedNextDate = DateTime.SpecifyKind(nextExpectedDate.Date, DateTimeKind.Utc);
            var normalizedEndDate = endDate.HasValue
                ? DateTime.SpecifyKind(endDate.Value.Date, DateTimeKind.Utc)
                : (DateTime?)null;

            if (normalizedEndDate.HasValue && normalizedEndDate.Value < normalizedNextDate)
                throw new DomainException("End date cannot be earlier than next expected date.");

            Label = label.Trim();
            Amount = decimal.Round(amount, 2);
            Direction = direction;
            Kind = kind;
            RecurrenceInterval = recurrenceInterval;
            NextExpectedDate = normalizedNextDate;
            EndDate = normalizedEndDate;
            Notes = notes?.Trim();
            UpdatedAt = DateTime.UtcNow;
        }

        public void MarkReceived()
        {
            if (Status == IncomeScheduleStatus.Completed)
                throw new DomainException("Already completed.");

            if (Kind == IncomeScheduleKind.OneTime)
            {
                Status = IncomeScheduleStatus.Completed;
            }
            else
            {
                NextExpectedDate = RecurrenceInterval switch
                {
                    IncomeRecurrenceInterval.Daily     => NextExpectedDate.AddDays(1),
                    IncomeRecurrenceInterval.Weekly    => NextExpectedDate.AddDays(7),
                    IncomeRecurrenceInterval.BiWeekly  => NextExpectedDate.AddDays(14),
                    IncomeRecurrenceInterval.Monthly   => NextExpectedDate.AddMonths(1),
                    IncomeRecurrenceInterval.Quarterly => NextExpectedDate.AddMonths(3),
                    IncomeRecurrenceInterval.Annually  => NextExpectedDate.AddYears(1),
                    _                                  => throw new DomainException("Unknown recurrence interval.")
                };
                NextExpectedDate = DateTime.SpecifyKind(NextExpectedDate, DateTimeKind.Utc);

                if (EndDate.HasValue && NextExpectedDate.Date > EndDate.Value.Date)
                {
                    Status = IncomeScheduleStatus.Completed;
                }
            }

            UpdatedAt = DateTime.UtcNow;
        }

        public void Pause()
        {
            if (Status == IncomeScheduleStatus.Active)
            {
                Status = IncomeScheduleStatus.Paused;
                UpdatedAt = DateTime.UtcNow;
            }
        }

        public void Resume()
        {
            if (Status == IncomeScheduleStatus.Paused)
            {
                Status = IncomeScheduleStatus.Active;
                UpdatedAt = DateTime.UtcNow;
            }
        }
    }
}
