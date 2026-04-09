using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging.Abstractions;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using Xunit;

namespace SmartFund.Tests.PersonalFinance;

public sealed class BankSyncServiceLaunchDateTests
{
    [Fact]
    public async Task First_sync_uses_user_launch_date_without_three_month_clamp()
    {
        var launchDate = DateTime.UtcNow.AddMonths(-9).Date;
        var settings = PersonalFinanceSettings.Create(1, launchDate, DateTime.UtcNow);

        var account = ConnectedBankAccount.Create(
            userId: 1,
            monoAccountId: "mono-1",
            bankName: "Test Bank",
            accountNumber: "0123456789",
            accountName: "Test User",
            accountType: "savings",
            currency: "NGN",
            lastKnownBalanceKobo: 0,
            utcNow: DateTime.UtcNow);

        var accountRepo = new FakeConnectedBankAccountRepository(account);
        var importRepo = new FakeBankImportedTransactionRepository();
        var ruleRepo = new FakeBankCategorizationRuleRepository();
        var mono = new FakeMonoApiClient();
        var settingsRepo = new FakePersonalFinanceSettingsRepository(settings);

        var inbox = new BankInboxService(
            importRepo,
            ruleRepo,
            new FakePersonalTransactionService(),
            new FakePersonalTransactionRepository(),
            new FakePersonalWalletRepository(),
            accountRepo);

        var transferDetection = new TransferDetectionService(importRepo, NullLogger<TransferDetectionService>.Instance);

        var service = new BankSyncService(
            accountRepo,
            importRepo,
            ruleRepo,
            new CategorizationEngine(),
            inbox,
            transferDetection,
            mono,
            settingsRepo,
            NullLogger<BankSyncService>.Instance);

        await service.SyncAccountAsync(account, CancellationToken.None);

        Assert.NotNull(mono.LastSince);
        Assert.Equal(launchDate, mono.LastSince!.Value.Date);
    }

    private sealed class FakeMonoApiClient : IMonoApiClient
    {
        public DateTime? LastSince { get; private set; }

        public Task<string> ExchangeCodeAsync(string authCode, CancellationToken ct) => Task.FromResult("mono-id");

        public Task<MonoAccountInfo> GetAccountInfoAsync(string monoAccountId, CancellationToken ct) =>
            Task.FromResult(new MonoAccountInfo
            {
                MonoAccountId = monoAccountId,
                BankName = "Test Bank",
                AccountNumber = "0123456789",
                AccountName = "Test User",
                AccountType = "savings",
                Currency = "NGN",
                BalanceKobo = 0
            });

        public Task<List<MonoTransaction>> GetTransactionsAsync(string monoAccountId, DateTime? since, CancellationToken ct)
        {
            LastSince = since;
            return Task.FromResult(new List<MonoTransaction>());
        }

        public Task<string> GenerateConnectTokenAsync(CancellationToken ct) => Task.FromResult("token");
    }

    private sealed class FakeConnectedBankAccountRepository : IConnectedBankAccountRepository
    {
        private readonly ConnectedBankAccount _account;

        public FakeConnectedBankAccountRepository(ConnectedBankAccount account) => _account = account;

        public Task<List<ConnectedBankAccount>> ListAsync(CancellationToken ct) => Task.FromResult(new List<ConnectedBankAccount> { _account });
        public Task<List<ConnectedBankAccount>> ListByUserAsync(long userId, CancellationToken ct) => Task.FromResult(new List<ConnectedBankAccount> { _account });
        public Task<ConnectedBankAccount?> GetByIdAsync(long id, CancellationToken ct) => Task.FromResult<ConnectedBankAccount?>(_account);
        public Task<ConnectedBankAccount?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) => Task.FromResult<ConnectedBankAccount?>(_account);
        public Task<ConnectedBankAccount?> GetByMonoAccountIdAsync(string monoAccountId, CancellationToken ct) => Task.FromResult<ConnectedBankAccount?>(_account);
        public Task<int> CountAsync(CancellationToken ct) => Task.FromResult(1);
        public Task AddAsync(ConnectedBankAccount account, CancellationToken ct) => Task.CompletedTask;
        public Task RemoveAsync(ConnectedBankAccount account, CancellationToken ct) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class FakeBankImportedTransactionRepository : IBankImportedTransactionRepository
    {
        public Task<BankImportedTransaction?> GetByIdAsync(long id, CancellationToken ct) => Task.FromResult<BankImportedTransaction?>(null);
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

    private sealed class FakeBankCategorizationRuleRepository : IBankCategorizationRuleRepository
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

    private sealed class FakePersonalFinanceSettingsRepository : IPersonalFinanceSettingsRepository
    {
        private readonly PersonalFinanceSettings _settings;

        public FakePersonalFinanceSettingsRepository(PersonalFinanceSettings settings) => _settings = settings;

        public Task<PersonalFinanceSettings?> GetAsync(CancellationToken ct) => Task.FromResult<PersonalFinanceSettings?>(_settings);
        public Task<PersonalFinanceSettings?> GetByUserAsync(long userId, CancellationToken ct) => Task.FromResult<PersonalFinanceSettings?>(_settings);
        public Task AddAsync(PersonalFinanceSettings settings, CancellationToken ct) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
    }

    private sealed class FakePersonalTransactionService : IPersonalTransactionService
    {
        public Task<long> RecordIncomeAsync(long userId, long walletId, long categoryId, decimal amount, string? description, DateTime date, CancellationToken ct) => Task.FromResult(1L);
        public Task<long> RecordExpenseAsync(long userId, long walletId, long categoryId, decimal amount, string? description, DateTime date, CancellationToken ct) => Task.FromResult(1L);
        public Task<long> RecordTransferAsync(long userId, long sourceWalletId, long destinationWalletId, decimal amount, string? description, DateTime date, CancellationToken ct) => Task.FromResult(1L);
    }

    private sealed class FakePersonalTransactionRepository : IPersonalTransactionRepository
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
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
        public Task<List<PersonalTransaction>> ListBankDerivedAsync(CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
        public Task<List<PersonalTransaction>> ListBankDerivedByUserAsync(long userId, CancellationToken ct) => Task.FromResult(new List<PersonalTransaction>());
    }

    private sealed class FakePersonalWalletRepository : IPersonalWalletRepository
    {
        public Task<PersonalWallet?> GetByIdAsync(long id, CancellationToken ct) => Task.FromResult<PersonalWallet?>(null);
        public Task<PersonalWallet?> GetByIdForUserAsync(long id, long userId, CancellationToken ct) => Task.FromResult<PersonalWallet?>(null);
        public Task<List<PersonalWallet>> ListAsync(CancellationToken ct) => Task.FromResult(new List<PersonalWallet>());
        public Task<List<PersonalWallet>> ListByUserAsync(long userId, CancellationToken ct) => Task.FromResult(new List<PersonalWallet>());
        public Task AddAsync(PersonalWallet wallet, CancellationToken ct) => Task.CompletedTask;
        public Task SaveChangesAsync(CancellationToken ct) => Task.CompletedTask;
    }
}
