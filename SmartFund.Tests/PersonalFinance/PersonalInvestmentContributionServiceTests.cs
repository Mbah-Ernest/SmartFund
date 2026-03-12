using FluentAssertions;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Tests.PersonalFinance.Fakes;

namespace SmartFund.Tests.PersonalFinance;

public sealed class PersonalInvestmentContributionServiceTests
{
    [Fact]
    public async Task Contribute_CreatesBalancedLedgerTransaction()
    {
        var walletRepo = new InMemoryPersonalWalletRepository();
        var trancheRepo = new InMemoryTrancheRepository();
        var ledgerTxRepo = new InMemoryLedgerTransactionRepository();
        var contribRepo = new InMemoryPersonalInvestmentContributionRepository();
        var txRepo = new InMemoryPersonalTransactionRepository();

        var wallet = PersonalWallet.Create("Main", "NGN", ledgerAccountId: 10);
        await walletRepo.AddAsync(wallet, CancellationToken.None);

        var tranche = Tranche.Create(
            trancheCode: "TR-001",
            investorId: 1,
            dealId: null,
            principal: 1000m,
            roiType: RoiType.Flat,
            roiRate: 0.1m,
            startDate: new DateTime(2026, 1, 1),
            maturityDate: new DateTime(2026, 12, 31),
            payoutType: PayoutType.AtMaturity,
            noticeDays: null,
            earlyWithdrawalPolicy: EarlyWithdrawalPolicy.NotAllowed);

        tranche.SetLiabilityAccount(55);
        await trancheRepo.AddAsync(tranche, CancellationToken.None);

        var svc = new PersonalInvestmentContributionService(walletRepo, trancheRepo, ledgerTxRepo, contribRepo, txRepo, new NullAuditService());

        var ledgerTxId = await svc.ContributeAsync(wallet.Id, tranche.Id, 200m, "Top up", CancellationToken.None);

        var tx = ledgerTxRepo.Transactions.Single(t => t.Id == ledgerTxId);

        var totalDebit = tx.Entries.Sum(e => e.Debit.Amount);
        var totalCredit = tx.Entries.Sum(e => e.Credit.Amount);
        totalDebit.Should().Be(totalCredit);

        contribRepo.Records.Should().ContainSingle();
        contribRepo.Records[0].LedgerTransactionId.Should().Be(ledgerTxId);

        txRepo.Transactions.Should().ContainSingle();
        txRepo.Transactions[0].LedgerTransactionId.Should().Be(ledgerTxId);
        txRepo.Transactions[0].TransactionType.Should().Be(PersonalTransactionType.InvestmentContribution);
    }
}
