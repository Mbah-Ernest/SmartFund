using FluentAssertions;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.ValueObjects;
using SmartFund.Tests.PersonalFinance.Fakes;

namespace SmartFund.Tests.PersonalFinance;

public sealed class PersonalWalletServiceTests
{
    private const long UserId = 1L;

    [Fact]
    public async Task CreateWallet_CreatesLedgerAccount_AndStoresLedgerAccountId()
    {
        var walletRepo = new InMemoryPersonalWalletRepository();
        var accountRepo = new InMemoryLedgerAccountRepository();
        var txRepo = new InMemoryLedgerTransactionRepository();

        var svc = new PersonalWalletService(walletRepo, accountRepo, txRepo);

        var wallet = await svc.CreateWalletAsync(UserId, "Main", "NGN", CancellationToken.None);

        wallet.Id.Should().BeGreaterThan(0);
        wallet.LedgerAccountId.Should().BeGreaterThan(0);
        wallet.Name.Should().Be("Main");

        accountRepo.Accounts.Should().ContainSingle();
        accountRepo.Accounts[0].Type.Should().Be(AccountType.Asset);
        accountRepo.Accounts[0].Name.Should().Contain("Main");
    }

    [Fact]
    public async Task GetWalletBalance_DerivesFromLedgerEntries()
    {
        var walletRepo = new InMemoryPersonalWalletRepository();
        var accountRepo = new InMemoryLedgerAccountRepository();
        var txRepo = new InMemoryLedgerTransactionRepository();

        var svc = new PersonalWalletService(walletRepo, accountRepo, txRepo);

        var wallet = await svc.CreateWalletAsync(UserId, "Main", "NGN", CancellationToken.None);

        // Balanced ledger tx that increases wallet by 100.
        var lt = LedgerTransaction.CreateDraft("seed");
        lt.AddDebit(wallet.LedgerAccountId, Money.NGN(100m));
        lt.AddCredit(accountId: 999, Money.NGN(100m));

        await txRepo.AddAsync(lt, CancellationToken.None);
        await txRepo.SaveChangesAsync(CancellationToken.None);

        var balance = await svc.GetWalletBalanceAsync(wallet.Id, CancellationToken.None);
        balance.Should().Be(100m);
    }
}
