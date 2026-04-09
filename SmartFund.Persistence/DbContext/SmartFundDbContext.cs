using Microsoft.EntityFrameworkCore;
using SmartFund.Domain.Agent;
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

        public DbSet<SmartFund.Domain.Entities.User> Users => Set<SmartFund.Domain.Entities.User>();
        public DbSet<SmartFund.Domain.Entities.LoanApplication> LoanApplications => Set<SmartFund.Domain.Entities.LoanApplication>();
        public DbSet<SmartFund.Domain.Entities.LoanApplicantProfile> LoanApplicantProfiles => Set<SmartFund.Domain.Entities.LoanApplicantProfile>();

        public DbSet<LedgerTransaction> LedgerTransactions => Set<LedgerTransaction>();
        public DbSet<SmartFund.Domain.Entities.LedgerAccount> LedgerAccounts => Set<SmartFund.Domain.Entities.LedgerAccount>();

        public DbSet<SmartFund.Domain.Entities.Deal> Deals => Set<SmartFund.Domain.Entities.Deal>();
        public DbSet<SmartFund.Domain.Entities.Investor> Investors => Set<SmartFund.Domain.Entities.Investor>();
        public DbSet<SmartFund.Domain.Entities.Tranche> Tranches => Set<SmartFund.Domain.Entities.Tranche>();
        public DbSet<SmartFund.Domain.Entities.Agreement> Agreements => Set<SmartFund.Domain.Entities.Agreement>();
        public DbSet<SmartFund.Domain.Entities.InsuranceWallet> InsuranceWallets => Set<SmartFund.Domain.Entities.InsuranceWallet>();

        public DbSet<PersonalWallet> PersonalWallets => Set<PersonalWallet>();
        public DbSet<PersonalCategory> PersonalCategories => Set<PersonalCategory>();
        public DbSet<PersonalTransaction> PersonalTransactions => Set<PersonalTransaction>();
        public DbSet<PersonalGoal> PersonalGoals => Set<PersonalGoal>();

        public DbSet<Budget> PersonalBudgets => Set<Budget>();
        public DbSet<BudgetTracking> PersonalBudgetTracking => Set<BudgetTracking>();

        public DbSet<ConnectedBankAccount> ConnectedBankAccounts => Set<ConnectedBankAccount>();
        public DbSet<BankImportedTransaction> BankImportedTransactions => Set<BankImportedTransaction>();
        public DbSet<BankCategorizationRule> BankCategorizationRules => Set<BankCategorizationRule>();

        public DbSet<AiInsight> AiInsights => Set<AiInsight>();
        public DbSet<BankStatementUpload> BankStatementUploads => Set<BankStatementUpload>();
        public DbSet<RecurringPattern> RecurringPatterns => Set<RecurringPattern>();

        public DbSet<PersonalFinanceSettings> PersonalFinanceSettings => Set<PersonalFinanceSettings>();

        public DbSet<PersonalDebt> PersonalDebts => Set<PersonalDebt>();
        public DbSet<PersonalDebtPayment> PersonalDebtPayments => Set<PersonalDebtPayment>();

        public DbSet<AuditEntry> AuditEntries => Set<AuditEntry>();
        public DbSet<PendingAgentAction> PendingAgentActions => Set<PendingAgentAction>();

        public DbSet<LedgerEntry> LedgerEntries => Set<LedgerEntry>();
        public DbSet<LedgerDailySequence> LedgerDailySequences => Set<LedgerDailySequence>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.ApplyConfigurationsFromAssembly(typeof(SmartFundDbContext).Assembly);
        }
    }
}