using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using System.Collections.Generic;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.Tests.PersonalFinance.Fakes;

internal sealed class InMemoryPersonalInvestmentContributionRepository : IPersonalInvestmentContributionRepository
{
    private long _nextId = 1;

    public List<PersonalInvestmentContribution> Records { get; } = new();

    public Task AddAsync(PersonalInvestmentContribution contribution, CancellationToken ct)
    {
        EntityId.Set(contribution, _nextId++);

        // In the real EF pipeline, LedgerTransactionId is set from the relationship.
        // Mimic that here so tests can assert the linkage.
        if (contribution.LedgerTransactionId <= 0 && contribution.LedgerTransaction is not null && contribution.LedgerTransaction.Id > 0)
        {
            var prop = typeof(PersonalInvestmentContribution).GetProperty(
                nameof(PersonalInvestmentContribution.LedgerTransactionId),
                BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
            prop?.SetValue(contribution, contribution.LedgerTransaction.Id);
        }

        Records.Add(contribution);
        return Task.CompletedTask;
    }

    public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
}
