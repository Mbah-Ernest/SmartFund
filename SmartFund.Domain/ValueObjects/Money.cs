using System;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Domain.ValueObjects
{
    public sealed class Money : IEquatable<Money>
    {
        public decimal Amount { get; }
        public string Currency { get; }

        private const string DefaultCurrency = "NGN";

        private Money(decimal amount, string currency)
        {
            Amount = amount;
            Currency = currency;
        }

        public static Money NGN(decimal amount)
        {
            if (amount < 0)
                throw new DomainException("Money amount cannot be negative.");

            // enforce 2dp
            if (decimal.Round(amount, 2) != amount)
                throw new DomainException("Money supports only 2 decimal places.");

            return new Money(amount, DefaultCurrency);
        }

        public static Money Zero() => new Money(0m, DefaultCurrency);

        public bool IsZero() => Amount == 0m;

        public Money Add(Money other)
        {
            EnsureSameCurrency(other);
            return NGN(Amount + other.Amount);
        }

        public Money Multiply(decimal factor)
        {
            if (factor < 0)
                throw new DomainException("Money multiply factor cannot be negative.");

            var result = decimal.Round(Amount * factor, 2);
            return NGN(result);
        }

        private void EnsureSameCurrency(Money other)
        {
            if (Currency != other.Currency)
                throw new DomainException("Currency mismatch.");
        }

        public bool Equals(Money? other)
        {
            if (other is null) return false;
            return Amount == other.Amount && Currency == other.Currency;
        }

        public override bool Equals(object? obj) => obj is Money m && Equals(m);

        public override int GetHashCode() => HashCode.Combine(Amount, Currency);

        public override string ToString() => $"{Currency} {Amount:N2}";
    }
}