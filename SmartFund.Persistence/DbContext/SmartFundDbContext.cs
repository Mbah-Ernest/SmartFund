using Microsoft.EntityFrameworkCore;
using SmartFund.Domain.Entities;
using SmartFund.Domain.PersonalBudget.Entities;
using SmartFund.Domain.PersonalFinance.Entities;

namespace SmartFund.Persistence.DbContext
{
    public class SmartFundDbContext : Microsoft.EntityFrameworkCore.DbContext
    {
        public SmartFundDbContext(DbContextOptions<SmartFundDbContext> options)
            : base(options)
        {
        }

        public DbSet<LedgerTransaction> LedgerTransactions => Set<LedgerTransaction>();
        public DbSet<SmartFund.Domain.Entities.LedgerAccount> LedgerAccounts => Set<SmartFund.Domain.Entities.LedgerAccount>();
        public DbSet<SmartFund.Domain.Entities.Investor> Investors => Set<SmartFund.Domain.Entities.Investor>();
        public DbSet<SmartFund.Domain.Entities.Deal> Deals => Set<SmartFund.Domain.Entities.Deal>();
        public DbSet<SmartFund.Domain.Entities.InsuranceWallet> InsuranceWallets => Set<SmartFund.Domain.Entities.InsuranceWallet>();
        public DbSet<SmartFund.Domain.Entities.Tranche> Tranches => Set<SmartFund.Domain.Entities.Tranche>();
        public DbSet<SmartFund.Domain.Entities.Agreement> Agreements => Set<SmartFund.Domain.Entities.Agreement>();

        public DbSet<PersonalWallet> PersonalWallets => Set<PersonalWallet>();
        public DbSet<PersonalCategory> PersonalCategories => Set<PersonalCategory>();
        public DbSet<PersonalTransaction> PersonalTransactions => Set<PersonalTransaction>();
        public DbSet<PersonalInvestmentContribution> PersonalInvestmentContributions => Set<PersonalInvestmentContribution>();
        public DbSet<PersonalGoal> PersonalGoals => Set<PersonalGoal>();

        public DbSet<Budget> PersonalBudgets => Set<Budget>();
        public DbSet<BudgetTracking> PersonalBudgetTracking => Set<BudgetTracking>();

        public DbSet<ConnectedBankAccount> ConnectedBankAccounts => Set<ConnectedBankAccount>();
        public DbSet<BankImportedTransaction> BankImportedTransactions => Set<BankImportedTransaction>();
        public DbSet<BankCategorizationRule> BankCategorizationRules => Set<BankCategorizationRule>();

        public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();

        public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();
        public DbSet<LedgerDailySequence> LedgerDailySequences => Set<LedgerDailySequence>();
        public DbSet<TrancheDailySequence> TrancheDailySequences => Set<TrancheDailySequence>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(SmartFundDbContext).Assembly);
        }
    }
}