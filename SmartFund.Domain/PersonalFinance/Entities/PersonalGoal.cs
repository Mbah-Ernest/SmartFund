using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.PersonalFinance.Entities
{
    public sealed class PersonalGoal
    {
        public long Id { get; private set; } // EF

        public string Name { get; private set; } = default!;
        public decimal TargetAmount { get; private set; }
        public decimal SavedAmount { get; private set; }
        public DateTime Deadline { get; private set; }
        public DateTime CreatedAt { get; private set; }

        private PersonalGoal() { } // EF

        private PersonalGoal(string name, decimal targetAmount, decimal savedAmount, DateTime deadline, DateTime createdAtUtc)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Goal name is required.");

            if (targetAmount <= 0)
                throw new DomainException("Target amount must be greater than zero.");

            if (savedAmount < 0)
                throw new DomainException("Saved amount cannot be negative.");

            Name = name.Trim();
            TargetAmount = decimal.Round(targetAmount, 2);
            SavedAmount = decimal.Round(savedAmount, 2);
            Deadline = DateTime.SpecifyKind(deadline, DateTimeKind.Utc);
            CreatedAt = DateTime.SpecifyKind(createdAtUtc, DateTimeKind.Utc);
        }

        public static PersonalGoal Create(string name, decimal targetAmount, DateTime deadline) =>
            new PersonalGoal(name, targetAmount, 0m, deadline, DateTime.UtcNow);

        public void Contribute(decimal amount)
        {
            if (amount <= 0)
                throw new DomainException("Contribution amount must be greater than zero.");

            SavedAmount = decimal.Round(SavedAmount + amount, 2);
        }

        public void UpdateTarget(decimal targetAmount)
        {
            if (targetAmount <= 0)
                throw new DomainException("Target amount must be greater than zero.");

            TargetAmount = decimal.Round(targetAmount, 2);
        }

        public void Rename(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Goal name is required.");

            Name = name.Trim();
        }
    }
}
