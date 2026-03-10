using System;
using FluentAssertions;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.ValueObjects;
using Xunit;

namespace SmartFund.Tests.Domain
{
    public class LedgerTransactionTests
    {
        [Fact]
        public void Post_ShouldFail_WhenLessThanTwoEntries()
        {
            var tx = LedgerTransaction.CreateDraft("test");
            tx.AddDebit(1, Money.NGN(1000m));

            Action act = () => tx.Post(DateTime.UtcNow, postedByUserId: 1, sequenceNumber: "SF-20260221-000001");

            act.Should().Throw<DomainException>()
                .WithMessage("*at least 2 entries*");
        }

        [Fact]
        public void Post_ShouldFail_WhenUnbalanced()
        {
            var tx = LedgerTransaction.CreateDraft("unbalanced");
            tx.AddDebit(1, Money.NGN(1000m));
            tx.AddCredit(2, Money.NGN(900m));

            Action act = () => tx.Post(DateTime.UtcNow, 1, "SF-20260221-000002");

            act.Should().Throw<DomainException>()
                .WithMessage("*unbalanced*");
        }

        [Fact]
        public void Post_ShouldSucceed_WhenBalanced()
        {
            var tx = LedgerTransaction.CreateDraft("balanced");
            tx.AddDebit(1, Money.NGN(1000m));
            tx.AddCredit(2, Money.NGN(1000m));

            tx.Post(DateTime.UtcNow, 1, "SF-20260221-000003");

            tx.Status.Should().Be(SmartFund.Domain.Enums.TransactionStatus.Posted);
            tx.SequenceNumber.Should().Be("SF-20260221-000003");
            tx.PostedByUserId.Should().Be(1);
            tx.PostedAtUtc.Should().NotBeNull();
        }

        [Fact]
        public void PostedTransaction_ShouldNotAllow_Modification()
        {
            var tx = LedgerTransaction.CreateDraft("freeze");
            tx.AddDebit(1, Money.NGN(1000m));
            tx.AddCredit(2, Money.NGN(1000m));
            tx.Post(DateTime.UtcNow, 1, "SF-20260221-000004");

            Action act = () => tx.AddDebit(3, Money.NGN(10m));

            act.Should().Throw<DomainException>()
                .WithMessage("*Only draft transactions can be modified*");
        }

        [Fact]
        public void CreateReversal_ShouldSwapDebitsAndCredits_AndRemainBalanced()
        {
            var tx = LedgerTransaction.CreateDraft("original");
            tx.AddDebit(10, Money.NGN(1500m));
            tx.AddCredit(20, Money.NGN(1500m));
            tx.Post(DateTime.UtcNow, 1, "SF-20260221-000005");

            var reversal = tx.CreateReversal(DateTime.UtcNow, 1, "SF-20260221-000006", "reversal");

            reversal.Status.Should().Be(SmartFund.Domain.Enums.TransactionStatus.Posted);
            reversal.ReversesTransactionId.Should().Be(tx.Id);

            // Ensure swapped
            reversal.Entries.Should().HaveCount(2);

            // Total debits == total credits
            var totalDebits = 0m;
            var totalCredits = 0m;

            foreach (var e in reversal.Entries)
            {
                totalDebits += e.Debit.Amount;
                totalCredits += e.Credit.Amount;
            }

            totalDebits.Should().Be(totalCredits);

            // Specifically swapped amounts
            reversal.Entries.Should().ContainSingle(e => e.AccountId == 10 && e.Credit.Amount == 1500m);
            reversal.Entries.Should().ContainSingle(e => e.AccountId == 20 && e.Debit.Amount == 1500m);
        }
    }
}