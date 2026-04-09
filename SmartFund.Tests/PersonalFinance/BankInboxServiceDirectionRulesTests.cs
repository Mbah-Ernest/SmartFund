using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using Xunit;

namespace SmartFund.Tests.PersonalFinance;

public sealed class BankInboxServiceDirectionRulesTests
{
    [Fact]
    public async Task CategorizeAsync_Credit_as_Expense_throws()
    {
        var service = CreateService(CreateImport("credit"));

        await Assert.ThrowsAsync<DomainException>(() => service.CategorizeAsync(
            userId: 1,
            importId: 100,
            walletId: 1,
            categoryId: 1,
            transactionType: PersonalTransactionType.Expense,
            description: null,
            createRule: false,
            ruleMatchText: null,
            ct: CancellationToken.None));
    }

    [Fact]
    public async Task CategorizeAsync_Debit_as_Income_throws()
    {
        var service = CreateService(CreateImport("debit"));

        await Assert.ThrowsAsync<DomainException>(() => service.CategorizeAsync(
            userId: 1,
            importId: 100,
            walletId: 1,
            categoryId: 1,
            transactionType: PersonalTransactionType.Income,
            description: null,
            createRule: false,
            ruleMatchText: null,
            ct: CancellationToken.None));
    }

    private static BankInboxService CreateService(BankImportedTransaction import)
    {
        return new BankInboxService(
            new FakeImportRepo(import),
            new FakeRuleRepo(),
            new FakeTxService(),
            new FakePersonalTxRepo(),
            new FakeWalletRepo(),
            new FakeBankAccountRepo());
    }

    private static BankImportedTransaction CreateImport(string direction) =>
        BankImportedTransaction.Create(
            connectedBankAccountId: 1,
            monoTransactionId: "tx-1",
            idempotencyHash: Guid.NewGuid().ToString("N"),
            amountKobo: 10000,
            direction: direction,
            rawNarration: "Test",
            normalizedNarration: "TEST",
            extractedMerchant: null,
            transactionDateUtc: DateTime.UtcNow,
            importedAtUtc: DateTime.UtcNow,
            isPending: false,
            isReversal: false,
            reversalOfMonoId: null);

    private sealed class FakeImportRepo : IBankImportedTransactionRepository
    {
        private readonly BankImportedTransaction _import;
        public FakeImportRepo(BankImportedTransaction import) => _import = import;
        public Task<BankImportedTransaction?> GetByIdAsync(long id, CancellationToken ct) => Task.FromResult<BankImportedTransaction?>(_import);
        public Task<BankImportedTransaction?> GetByMonoTransactionIdAsync(string monoTransactionId, long connectedBankAccountId, CancellationToken ct) => Task.FromResult<BankImportedTransaction?>(null);
        public Task<BankImportedTransaction?> GetByHashAsync(string hash, CancellationToken ct) => Task.FromResult<BankImportedTransaction?>(null);
        public Task<List<BankImportedTransaction>> ListByStatusAsync(BankImportStatus status, CancellationToken ct) => Task.FromResult(new List<BankImportedTransaction>());
        public Task<List<BankImportedTransaction>> ListNeedsReviewAsync(int page, int pageSize, long userId, long? accountId, CancellationToken ct) => Task.FromResult(new List<BankImportedTransaction>());
        public Task<int> CountNeedsReviewAsync(long userId, CancellationToken ct) => Task.FromResult(0);
        public Task<List<BankImportedTransaction>> ListInboxAsync(int page, int pageSize, long userId, long? accountId, CancellationToken ct) => Task.FromResult(new List<BankImportedTransaction>());
        public Task<List<BankImportedTransaction>> FindPotentialPairsAsync(long excludeAccountId, long amountKobo, string oppositeDirection, DateTime transactionDateUtc, int windowDays, CancellationToken ct) => Task.FromResult(new List<BankImportedTransaction>());
        public Task<List<BankImportedTransaction>> ListByAccountAsync(long accountId, CancellationToken ct) => Task.FromResult(new List<BankImportedTransaction>());
        public Task DeleteByAccountAsync(long accountId, CancellationToken ct) => Task.CompletedTask;
        public Task AddAsync(BankImportedTransaction tx, CancellationToken ct) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
        public Task DeleteAllAsync(CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class FakeRuleRepo : IBankCategorizationRuleRepository
    {
        public Task<BankCategorizationRule?> GetByIdAsync(long id, CancellationToken ct) => Task.FromResult<BankCategorizationRule?>(null);
        public Task<BankCategorizationRule?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) => Task.FromResult<BankCategorizationRule?>(null);
        public Task<List<BankCategorizationRule>> ListActiveAsync(CancellationToken ct) => Task.FromResult(new List<BankCategorizationRule>());
        public Task<List<BankCategorizationRule>> ListActiveByUserAsync(long userId, CancellationToken ct) => Task.FromResult(new List<BankCategorizationRule>());
        public Task<List<BankCategorizationRule>> ListAllAsync(CancellationToken ct) => Task.FromResult(new List<BankCategorizationRule>());
        public Task<List<BankCategorizationRule>> ListAllByUserAsync(long userId, CancellationToken ct) => Task.FromResult(new List<BankCategorizationRule>());
        public Task AddAsync(BankCategorizationRule rule, CancellationToken ct) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class FakeTxService : IPersonalTransactionService
    {
        public Task<long> RecordIncomeAsync(long userId, long walletId, long categoryId, decimal amount, string? description, DateTime date, CancellationToken ct) => Task.FromResult(1L);
        public Task<long> RecordExpenseAsync(long userId, long walletId, long categoryId, decimal amount, string? description, DateTime date, CancellationToken ct) => Task.FromResult(1L);
        public Task<long> RecordTransferAsync(long userId, long sourceWalletId, long destinationWalletId, decimal amount, string? description, DateTime date, CancellationToken ct) => Task.FromResult(1L);
        public Task DeleteTransactionAsync(long userId, long transactionId, CancellationToken ct) => Task.CompletedTask;
        public Task<long> EditTransactionAsync(long userId, long transactionId, long categoryId, decimal amount, DateTime date, string? description, CancellationToken ct) => Task.FromResult(1L);
    }

    private sealed class FakePersonalTxRepo : IPersonalTransactionRepository
    {
        public Task<PersonalTransaction?> GetByIdAsync(long id, CancellationToken ct) => Task.FromResult<PersonalTransaction?>(null);
        public Task<List<PersonalTransaction>> ListByWalletIdAsync(long walletId, CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
        public Task<List<PersonalTransaction>> ListAllAsync(CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
        public Task<List<PersonalTransaction>> ListByUserAsync(long userId, CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
        public Task<List<PersonalTransaction>> ListByDateRangeAsync(DateTime from, DateTime to, CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
        public Task<List<PersonalTransaction>> ListByUserAndDateRangeAsync(long userId, DateTime from, DateTime to, CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
        public Task<List<PersonalTransaction>> ListRecentAsync(int take, CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
        public Task<List<PersonalTransaction>> ListRecentByUserAsync(long userId, int take, CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
        public Task AddAsync(PersonalTransaction tx, CancellationToken ct) => Task.CompletedTask;
        public Task RemoveAsync(PersonalTransaction tx, CancellationToken ct) => Task.CompletedTask;
        public Task<List<PersonalTransaction>> ListByLedgerTransactionIdAsync(long ledgerTransactionId, CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<List<PersonalTransaction>> ListBankDerivedAsync(CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
        public Task<List<PersonalTransaction>> ListBankDerivedByUserAsync(long userId, CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
    }

    private sealed class FakeWalletRepo : IPersonalWalletRepository
    {
        public Task<PersonalWallet?> GetByIdAsync(long id, CancellationToken ct) => Task.FromResult<PersonalWallet?>(null);
        public Task<PersonalWallet?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) => Task.FromResult<PersonalWallet?>(null);
        public Task<List<PersonalWallet>> ListAsync(CancellationToken ct) => Task.FromResult(new List<PersonalWallet>());
        public Task<List<PersonalWallet>> ListByUserAsync(long userId, CancellationToken ct) => Task.FromResult(new List<PersonalWallet>());
        public Task AddAsync(PersonalWallet wallet, CancellationToken ct) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class FakeBankAccountRepo : IConnectedBankAccountRepository
    {
        public Task<List<ConnectedBankAccount>> ListAsync(CancellationToken ct) => Task.FromResult(new List<ConnectedBankAccount>());
        public Task<List<ConnectedBankAccount>> ListByUserAsync(long userId, CancellationToken ct) => Task.FromResult(new List<ConnectedBankAccount>());
        public Task<ConnectedBankAccount?> GetByIdAsync(long id, CancellationToken ct) => Task.FromResult<ConnectedBankAccount?>(null);
        public Task<ConnectedBankAccount?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) => Task.FromResult<ConnectedBankAccount?>(null);
        public Task<ConnectedBankAccount?> GetByMonoAccountIdAsync(string monoAccountId, CancellationToken ct) => Task.FromResult<ConnectedBankAccount?>(null);
        public Task<int> CountAsync(CancellationToken ct) => Task.FromResult(0);
        public Task AddAsync(ConnectedBankAccount account, CancellationToken ct) => Task.CompletedTask;
        public Task RemoveAsync(ConnectedBankAccount account, CancellationToken ct) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
    }
}
