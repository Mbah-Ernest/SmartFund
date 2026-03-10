using FluentAssertions;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Tests.PersonalFinance.Fakes;

namespace SmartFund.Tests.PersonalFinance;

public sealed class PersonalTransactionServiceTests
{
    [Fact]
    public async Task RecordIncome_CreatesBalancedLedgerTransaction()
    {
        var walletRepo = new InMemoryPersonalWalletRepository();
        var categoryRepo = new InMemoryPersonalCategoryRepository();
        var personalTxRepo = new InMemoryPersonalTransactionRepository();
        var budgetRepo = new NullPersonalBudgetRepository();
        var budgetTrackingRepo = new NullPersonalBudgetTrackingRepository();
        var accountRepo = new InMemoryLedgerAccountRepository();
        var ledgerTxRepo = new InMemoryLedgerTransactionRepository();

        var wallet = PersonalWallet.Create("Main", "NGN", ledgerAccountId: 1);
        await walletRepo.AddAsync(wallet, CancellationToken.None);

        var incomeCategory = PersonalCategory.Create("Salary", PersonalCategoryType.Income);
        await categoryRepo.AddAsync(incomeCategory, CancellationToken.None);

        var svc = new PersonalTransactionService(
            walletRepo,
            categoryRepo,
            personalTxRepo,
            budgetRepo,
            budgetTrackingRepo,
            accountRepo,
            ledgerTxRepo);

        var ledgerTxId = await svc.RecordIncomeAsync(
            wallet.Id,
            incomeCategory.Id,
            2500m,
            "March salary",
            new DateTime(2026, 3, 1),
            CancellationToken.None);

        ledgerTxRepo.Transactions.Should().ContainSingle(t => t.Id == ledgerTxId);
        var tx = ledgerTxRepo.Transactions.Single(t => t.Id == ledgerTxId);

        tx.Entries.Should().HaveCount(2);

        var totalDebit = tx.Entries.Sum(e => e.Debit.Amount);
        var totalCredit = tx.Entries.Sum(e => e.Credit.Amount);
        totalDebit.Should().Be(totalCredit);
    }

    [Fact]
    public async Task RecordExpense_CreatesBalancedLedgerTransaction()
    {
        var walletRepo = new InMemoryPersonalWalletRepository();
        var categoryRepo = new InMemoryPersonalCategoryRepository();
        var personalTxRepo = new InMemoryPersonalTransactionRepository();
        var budgetRepo = new NullPersonalBudgetRepository();
        var budgetTrackingRepo = new NullPersonalBudgetTrackingRepository();
        var accountRepo = new InMemoryLedgerAccountRepository();
        var ledgerTxRepo = new InMemoryLedgerTransactionRepository();

        var wallet = PersonalWallet.Create("Main", "NGN", ledgerAccountId: 1);
        await walletRepo.AddAsync(wallet, CancellationToken.None);

        var expenseCategory = PersonalCategory.Create("Food", PersonalCategoryType.Expense);
        await categoryRepo.AddAsync(expenseCategory, CancellationToken.None);

        var svc = new PersonalTransactionService(
            walletRepo,
            categoryRepo,
            personalTxRepo,
            budgetRepo,
            budgetTrackingRepo,
            accountRepo,
            ledgerTxRepo);

        var ledgerTxId = await svc.RecordExpenseAsync(
            wallet.Id,
            expenseCategory.Id,
            150m,
            "Lunch",
            new DateTime(2026, 3, 2),
            CancellationToken.None);

        var tx = ledgerTxRepo.Transactions.Single(t => t.Id == ledgerTxId);

        var totalDebit = tx.Entries.Sum(e => e.Debit.Amount);
        var totalCredit = tx.Entries.Sum(e => e.Credit.Amount);
        totalDebit.Should().Be(totalCredit);
    }

    [Fact]
    public async Task RecordTransfer_CreatesBalancedLedgerTransaction()
    {
        var walletRepo = new InMemoryPersonalWalletRepository();
        var categoryRepo = new InMemoryPersonalCategoryRepository();
        var personalTxRepo = new InMemoryPersonalTransactionRepository();
        var budgetRepo = new NullPersonalBudgetRepository();
        var budgetTrackingRepo = new NullPersonalBudgetTrackingRepository();
        var accountRepo = new InMemoryLedgerAccountRepository();
        var ledgerTxRepo = new InMemoryLedgerTransactionRepository();

        var sourceWallet = PersonalWallet.Create("Source", "NGN", ledgerAccountId: 10);
        var destWallet = PersonalWallet.Create("Dest", "NGN", ledgerAccountId: 20);
        await walletRepo.AddAsync(sourceWallet, CancellationToken.None);
        await walletRepo.AddAsync(destWallet, CancellationToken.None);

        var svc = new PersonalTransactionService(
            walletRepo,
            categoryRepo,
            personalTxRepo,
            budgetRepo,
            budgetTrackingRepo,
            accountRepo,
            ledgerTxRepo);

        var ledgerTxId = await svc.RecordTransferAsync(
            sourceWallet.Id,
            destWallet.Id,
            500m,
            "Move money",
            new DateTime(2026, 3, 3),
            CancellationToken.None);

        var tx = ledgerTxRepo.Transactions.Single(t => t.Id == ledgerTxId);

        var totalDebit = tx.Entries.Sum(e => e.Debit.Amount);
        var totalCredit = tx.Entries.Sum(e => e.Credit.Amount);
        totalDebit.Should().Be(totalCredit);
    }
}
