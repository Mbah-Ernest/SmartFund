// ============================================================
//  SmartFund Dev Seeder
//
//  Usage (from solution root):
//    dotnet run --project SmartFund.Seeder              → seed if DB is empty
//    dotnet run --project SmartFund.Seeder -- --reset   → drop, migrate, re-seed
//
//  Delete this entire project when going to production.
// ============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.PersonalBudget.Entities;
using SmartFund.Domain.PersonalBudget.Enums;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Persistence.DbContext;

// ── Config ────────────────────────────────────────────────────────────────────
bool reset = args.Contains("--reset");
bool personalFinanceOnly = args.Contains("--personal-finance") || args.Contains("--personal");

var config = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: true)
    .Build();

var cs = config.GetConnectionString("DefaultConnection")
    ?? "Server=(localdb)\\mssqllocaldb;Database=SmartFundDb;Trusted_Connection=True;MultipleActiveResultSets=true";

var services = new ServiceCollection();
services.AddDbContext<SmartFundDbContext>(opt => opt.UseSqlServer(cs));

await using var sp   = services.BuildServiceProvider();
await using var scope = sp.CreateAsyncScope();
var db = scope.ServiceProvider.GetRequiredService<SmartFundDbContext>();

// ── Reset ─────────────────────────────────────────────────────────────────────
if (reset)
{
    Console.Write("⚠  --reset: dropping database… ");
    await db.Database.EnsureDeletedAsync();
    Console.WriteLine("done.");
}

Console.Write("Applying migrations… ");
try
{
    await db.Database.MigrateAsync();
    Console.WriteLine("done.");
}
catch (InvalidOperationException ex)
    when (ex.Message.Contains("PendingModelChangesWarning", StringComparison.OrdinalIgnoreCase))
{
    Console.WriteLine();
    Console.WriteLine("⚠ Pending model changes detected. Creating database from current model (dev seeder fallback)…");
    try
    {
        // EnsureCreated requires an empty database. If a partially-created DB exists,
        // this will fail and the user should run with --reset.
        var created = await db.Database.EnsureCreatedAsync();
        if (!created)
        {
            Console.WriteLine("⚠ Existing database detected. Recreating to match the current model (dev seeder will wipe data)…");
            await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
        }

        Console.WriteLine("✓ Database ready.");
    }
    catch (Exception)
    {
        Console.WriteLine("✗ Unable to create database from model. Run: dotnet run --project SmartFund.Seeder -- --reset");
        throw;
    }
}

// ── Personal Finance only mode ────────────────────────────────────────────────
if (personalFinanceOnly)
{
    if (await db.PersonalWallets.AnyAsync())
    {
        Console.WriteLine("✓ Personal Finance data already exists. Run with --reset to wipe and re-seed.");
        return;
    }

    Banner("SmartFund Personal Finance Seeder");
    Step("Seeding personal finance data");

    var existingTranches = await db.Tranches.AsNoTracking().ToListAsync();
    var personal = await SeedPersonalFinanceAsync(db, DateTime.UtcNow, existingTranches);
    Done(personal.Transactions, $"{personal.Wallets} wallets · {personal.Categories} categories · {personal.Contributions} contributions");

    Banner("Seed complete");
    Console.WriteLine($"  Personal Wallets              : {personal.Wallets}");
    Console.WriteLine($"  Personal Categories           : {personal.Categories}");
    Console.WriteLine($"  Personal Transactions (6 mo)  : {personal.Transactions}");
    Console.WriteLine($"  Investment Contributions      : {personal.Contributions}");
    Console.WriteLine($"  Personal Budgets              : {personal.Budgets}");
    Console.WriteLine($"  Budget Tracking Rows          : {personal.BudgetTrackingRows}");
    Console.WriteLine($"  Personal Goals                : {personal.Goals}");
    Console.WriteLine($"  Ledger Accounts (added)       : {personal.LedgerAccountsAdded}");
    Console.WriteLine();
    return;
}

if (await db.Investors.AnyAsync())
{
    Console.WriteLine("✓ Database already has data. Run with --reset to wipe and re-seed.");
    return;
}

var now = DateTime.UtcNow;

Banner("SmartFund Dev Seeder");

// ── 1. INVESTORS ──────────────────────────────────────────────────────────────
Step("Seeding investors");
var investors = new[]
{
    Investor.Create("Aisha Bello",        "aisha.bello@example.com",     "+2348011111111", now),  // [0]
    Investor.Create("Chukwuemeka Obi",    "emeka.obi@example.com",       "+2348022222222", now),  // [1]
    Investor.Create("Fatima Al-Hassan",   "fatima.hassan@example.com",   "+2348033333333", now),  // [2]
    Investor.Create("Daniel Okafor",      "daniel.okafor@example.com",   "+2348044444444", now),  // [3]
    Investor.Create("Ngozi Adeyemi",      "ngozi.adeyemi@example.com",   null,             now),  // [4]
    Investor.Create("Adeola Taiwo",       "adeola.taiwo@example.com",    "+2348066666666", now),  // [5]
    Investor.Create("Ibrahim Musa",       "ibrahim.musa@example.com",    "+2348077777777", now),  // [6]
    Investor.Create("Blessing Eze",       "blessing.eze@example.com",    "+2348088888888", now),  // [7]
    Investor.Create("Tunde Fashola",      "tunde.fashola@example.com",   "+2348099999999", now),  // [8]
    Investor.Create("Chiamaka Nwosu",     "chiamaka.nwosu@example.com",  "+2348010101010", now),  // [9]
};
investors[7].Deactivate(); // Blessing Eze intentionally inactive
db.Investors.AddRange(investors);
await db.SaveChangesAsync();
Done(investors.Length);

// ── 2. DEALS ──────────────────────────────────────────────────────────────────
Step("Seeding deals");
var deals = new[]
{
    Deal.Create("DL-2026-001", "Real Estate Bridge Loan",        "Sunrise Properties Ltd",   45_000_000m, 0.18m, 12, now),  // [0]
    Deal.Create("DL-2026-002", "SME Working Capital",            "TechGrow Solutions Ltd",   20_000_000m, 0.22m,  9, now),  // [1]
    Deal.Create("DL-2026-003", "Infrastructure Lease Finance",   "Metro Build Co",           75_000_000m, 0.15m, 24, now),  // [2]
    Deal.Create("DL-2026-004", "Agricultural Equipment Finance", "AgroFirst Nigeria Ltd",    15_000_000m, 0.20m, 18, now),  // [3]
    Deal.Create("DL-2026-005", "Retail Expansion Loan",          "QuickMart Stores Ltd",     30_000_000m, 0.17m, 15, now),  // [4] closed
};
deals[4].Close();
db.Deals.AddRange(deals);
await db.SaveChangesAsync();
Done(deals.Length);

// ── 3. LEDGER ACCOUNTS (shared) ───────────────────────────────────────────────
Step("Seeding core ledger accounts");
var cashAccount    = LedgerAccount.Create("Main Cash / Operating Account", AccountType.Asset,    ReferenceType.None);
var revenueAccount = LedgerAccount.Create("Interest Revenue",              AccountType.Revenue,   ReferenceType.None);
var expenseAccount = LedgerAccount.Create("Operational Expenses",          AccountType.Expense,   ReferenceType.None);
var globalReserve  = LedgerAccount.Create("Global Insurance Reserve",      AccountType.Liability, ReferenceType.InsuranceWallet);
db.LedgerAccounts.AddRange(cashAccount, revenueAccount, expenseAccount, globalReserve);

// One reserve account per deal wallet
var dealReserveAccounts = deals
    .Select(d => LedgerAccount.Create($"Insurance Reserve – {d.DealCode}", AccountType.Liability, ReferenceType.InsuranceWallet))
    .ToArray();
db.LedgerAccounts.AddRange(dealReserveAccounts);
await db.SaveChangesAsync();
Done(4 + deals.Length, "core + per-deal reserve accounts");

// ── 4. INSURANCE WALLETS ──────────────────────────────────────────────────────
Step("Seeding insurance wallets");
var globalWallet = InsuranceWallet.CreateGlobal();
globalWallet.SetReserveAccount(globalReserve.Id);
globalWallet.Fund(8_000_000m);
db.InsuranceWallets.Add(globalWallet);

var dealWallets = deals.Select((d, i) =>
{
    var w = InsuranceWallet.CreateForDeal(d.Id);
    w.SetReserveAccount(dealReserveAccounts[i].Id);
    w.Fund(650_000m);
    return w;
}).ToArray();
db.InsuranceWallets.AddRange(dealWallets);
await db.SaveChangesAsync();
Done(1 + deals.Length, "global + per-deal");

// ── 5. TRANCHES ───────────────────────────────────────────────────────────────
Step("Seeding tranches + liability accounts");

// (Code, InvIdx, DealIdx, Principal, RoiType, Rate, StartDaysAgo, MaturityDaysFromNow, Payout, NoticeDays, EWPolicy)
var seeds = new (string Code, int Inv, int? Deal, decimal Principal, RoiType Roi, decimal Rate,
                 int StartAgo, int MaturityOffset, PayoutType Payout, int? Notice, EarlyWithdrawalPolicy EW)[]
{
    // ── MATURED (historical data) ──────────────────────────────────────────────
    ("TRN-20250801-0001", 0, 0,  5_000_000m, RoiType.SimpleInterest,   0.15m, 430,  -60, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),
    ("TRN-20251101-0002", 7, 4,  2_000_000m, RoiType.Flat,             0.17m, 295,  -30, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.Allowed_LoseAllRoi),
    ("TRN-20251201-0003", 9, 4,  3_500_000m, RoiType.Flat,             0.17m, 380,  -90, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.Allowed_LoseAllRoi),
    ("TRN-20251115-0004", 8, 2,  8_000_000m, RoiType.SimpleInterest,   0.15m, 380,  -45, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),

    // ── UPCOMING ≤ 30 DAYS ────────────────────────────────────────────────────
    ("TRN-20260101-0005", 0, 0,  7_000_000m, RoiType.CompoundInterest, 0.15m, 355,   10, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),
    ("TRN-20260101-0006", 1, 0,  3_500_000m, RoiType.Flat,             0.12m, 345,   20, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.Allowed_ProRataRoi),
    ("TRN-20260101-0007", 1, 1,  2_000_000m, RoiType.SimpleInterest,   0.20m, 268,    5, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.Allowed_ProRataRoi),
    ("TRN-20260101-0008", 2, 1,  8_000_000m, RoiType.CompoundInterest, 0.18m, 271,    3, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),
    ("TRN-20260101-0009", 3, 0,  2_000_000m, RoiType.SimpleInterest,   0.20m, 362,   28, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.Allowed_LoseAllRoi),
    ("TRN-20260101-0010", 3, 0,  4_200_000m, RoiType.Flat,             0.16m, 365,   25, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),
    ("TRN-20260101-0011", 4, 3,  6_000_000m, RoiType.CompoundInterest, 0.20m, 353,   12, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),
    ("TRN-20260101-0012", 5, 1,  2_500_000m, RoiType.SimpleInterest,   0.22m, 266,    8, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.Allowed_LoseAllRoi),
    ("TRN-20260101-0013", 6, 4,  4_000_000m, RoiType.Flat,             0.17m, 349,   15, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),
    ("TRN-20260101-0014", 9, 1,  6_000_000m, RoiType.CompoundInterest, 0.22m, 348,   18, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),
    ("TRN-20260101-0015", 0, 1,  3_000_000m, RoiType.SimpleInterest,   0.22m, 268,   22, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.Allowed_ProRataRoi),
    ("TRN-20260101-0016", 2, 2, 12_000_000m, RoiType.SimpleInterest,   0.14m, 275,   29, PayoutType.Periodic,           null, EarlyWithdrawalPolicy.Allowed_PenaltyFee),

    // ── FUTURE > 30 DAYS ──────────────────────────────────────────────────────
    ("TRN-20260201-0017", 8, 0, 10_000_000m, RoiType.CompoundInterest, 0.18m, 180,   45, PayoutType.Periodic,           null, EarlyWithdrawalPolicy.Allowed_PenaltyFee),
    ("TRN-20260201-0018", 2, 2, 12_000_000m, RoiType.CompoundInterest, 0.14m, 185,  180, PayoutType.Periodic,           null, EarlyWithdrawalPolicy.Allowed_PenaltyFee),
    ("TRN-20260201-0019", 4, 2,  3_000_000m, RoiType.SimpleInterest,   0.15m,  90,  120, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),
    ("TRN-20260201-0020", 5, 3,  5_000_000m, RoiType.Flat,             0.20m,  30,  365, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),
    ("TRN-20260201-0021", 8, 2,  8_000_000m, RoiType.SimpleInterest,   0.15m, 200,  200, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),
    ("TRN-20260201-0022", 2, 3,  5_000_000m, RoiType.CompoundInterest, 0.20m,  92,  270, PayoutType.AtMaturity,         null, EarlyWithdrawalPolicy.NotAllowed),

    // ── ON-DEMAND WITH NOTICE ─────────────────────────────────────────────────
    ("TRN-20260201-0023", 1, null, 1_500_000m, RoiType.SimpleInterest, 0.10m,  30,  335, PayoutType.OnDemandWithNotice, 14,  EarlyWithdrawalPolicy.Allowed_ProRataRoi),
    ("TRN-20260201-0024", 3, null, 2_000_000m, RoiType.Flat,           0.12m,  15,  400, PayoutType.OnDemandWithNotice,  7,  EarlyWithdrawalPolicy.Allowed_ProRataRoi),
};

var tranches = new List<Tranche>();

foreach (var s in seeds)
{
    var startDate    = now.Date.AddDays(-s.StartAgo);
    var maturityDate = now.Date.AddDays(s.MaturityOffset);

    // Safety: maturity must always be after start
    if (maturityDate <= startDate)
        maturityDate = startDate.AddDays(1);

    // Each tranche gets its own liability ledger account
    var liabilityAcct = LedgerAccount.Create(
        $"Investor Liability – {s.Code}",
        AccountType.Liability,
        ReferenceType.Tranche);
    db.LedgerAccounts.Add(liabilityAcct);
    await db.SaveChangesAsync(); // need the ID immediately

    var t = Tranche.Create(
        trancheCode:           s.Code,
        investorId:            investors[s.Inv].Id,
        dealId:                s.Deal.HasValue ? deals[s.Deal.Value].Id : null,
        principal:             s.Principal,
        roiType:               s.Roi,
        roiRate:               s.Rate,
        startDate:             startDate,
        maturityDate:          maturityDate,
        payoutType:            s.Payout,
        noticeDays:            s.Notice,
        earlyWithdrawalPolicy: s.EW);

    t.SetLiabilityAccount(liabilityAcct.Id);
    tranches.Add(t);
}

db.Tranches.AddRange(tranches);
await db.SaveChangesAsync();
Done(tranches.Count, "4 matured · 12 upcoming ≤30d · 8 future");

// ── 6. AGREEMENTS ─────────────────────────────────────────────────────────────
Step("Seeding agreements");
var agreements = tranches.Select((t, i) => Agreement.Create(
    trancheId:   t.Id,
    version:     1,
    signedName:  investors[seeds[i].Inv].FullName,
    signedAtUtc: now.AddDays(-(seeds[i].StartAgo - 1)),
    documentUrl: $"https://docs.smartfund.dev/agreements/{t.TrancheCode}-v1.pdf"))
    .ToList();
db.Agreements.AddRange(agreements);
await db.SaveChangesAsync();
Done(agreements.Count);

// ── 7. PERSONAL FINANCE ───────────────────────────────────────────────────────
Step("Seeding personal finance data");
var personalSeed = await SeedPersonalFinanceAsync(db, now, tranches);
Done(personalSeed.Transactions, $"{personalSeed.Wallets} wallets · {personalSeed.Categories} categories · {personalSeed.Contributions} contributions");

// ── Summary ───────────────────────────────────────────────────────────────────
int totalAccounts = 4 + deals.Length + tranches.Count + personalSeed.LedgerAccountsAdded;

Banner("Seed complete");
Console.WriteLine($"  Investors         : {investors.Length}  (1 inactive)");
Console.WriteLine($"  Deals             : {deals.Length}  (1 closed)");
Console.WriteLine($"  Tranches          : {tranches.Count}");
Console.WriteLine($"    ↳ matured       : 4");
Console.WriteLine($"    ↳ upcoming ≤30d : 12");
Console.WriteLine($"    ↳ future >30d   : 8");
Console.WriteLine($"  Agreements        : {agreements.Count}");
Console.WriteLine($"  Personal Wallets   : {personalSeed.Wallets}");
Console.WriteLine($"  Personal Categories: {personalSeed.Categories}");
Console.WriteLine($"  Personal Tx (6 mo) : {personalSeed.Transactions}");
Console.WriteLine($"  PF Budgets         : {personalSeed.Budgets}  (tracking: {personalSeed.BudgetTrackingRows})");
Console.WriteLine($"  PF Goals           : {personalSeed.Goals}");
Console.WriteLine($"  Insurance Wallets : {1 + deals.Length}  (1 global · {deals.Length} deal-level)");
Console.WriteLine($"  Ledger Accounts   : {totalAccounts}");
Console.WriteLine();

// ── Personal Finance Seeder ───────────────────────────────────────────────────
static async Task<(int Wallets, int Categories, int Transactions, int Contributions, int Budgets, int BudgetTrackingRows, int Goals, int LedgerAccountsAdded)>
    SeedPersonalFinanceAsync(SmartFundDbContext db, DateTime nowUtc, IReadOnlyList<Tranche> tranches)
{
    var ledgerAccountsBefore = await db.LedgerAccounts.CountAsync();
    var rng = new Random(42);

    static DateTime DayInMonth(DateTime monthStart, int day)
    {
        var days = DateTime.DaysInMonth(monthStart.Year, monthStart.Month);
        var d = Math.Clamp(day, 1, days);
        return new DateTime(monthStart.Year, monthStart.Month, d);
    }

    async Task<long> GetOrCreateLedgerAccountAsync(string name, AccountType type)
    {
        var existing = await db.LedgerAccounts.FirstOrDefaultAsync(a => a.Name == name);
        if (existing is not null) return existing.Id;

        var acct = LedgerAccount.Create(name, type, ReferenceType.Personal);
        db.LedgerAccounts.Add(acct);
        await db.SaveChangesAsync();
        return acct.Id;
    }

    async Task<PersonalWallet> CreateWalletAsync(string name)
    {
        var existing = await db.PersonalWallets.FirstOrDefaultAsync(w => w.Name == name);
        if (existing is not null) return existing;

        var acct = LedgerAccount.Create($"Personal Wallet: {name}", AccountType.Asset, ReferenceType.Personal);
        db.LedgerAccounts.Add(acct);
        await db.SaveChangesAsync();

        var wallet = PersonalWallet.Create(name, "NGN", acct.Id, nowUtc);
        db.PersonalWallets.Add(wallet);
        await db.SaveChangesAsync();
        return wallet;
    }

    async Task<PersonalCategory> GetOrCreateCategoryAsync(string name, PersonalCategoryType type)
    {
        var existing = await db.PersonalCategories.FirstOrDefaultAsync(c => c.Name == name && c.Type == type);
        if (existing is not null) return existing;

        var cat = PersonalCategory.Create(name, type);
        db.PersonalCategories.Add(cat);
        await db.SaveChangesAsync();
        return cat;
    }

    async Task<long> SeedIncomeAsync(PersonalWallet wallet, PersonalCategory category, decimal amount, DateTime date, string? description)
    {
        var narration = string.IsNullOrWhiteSpace(description)
            ? $"Personal income ({category.Name})"
            : $"Personal income ({category.Name}): {description.Trim()}";

        var incomeAccountId = await GetOrCreateLedgerAccountAsync("Personal Finance Income", AccountType.Revenue);
        var tx = LedgerTransaction.CreateDraft(narration, ReferenceType.Personal, wallet.Id);
        tx.AddEntry(wallet.LedgerAccountId, debit: amount, credit: 0m);
        tx.AddEntry(incomeAccountId, debit: 0m, credit: amount);
        db.LedgerTransactions.Add(tx);
        await db.SaveChangesAsync();

        var personalTx = PersonalTransaction.Create(wallet.Id, category.Id, amount, PersonalTransactionType.Income, date, description);
        personalTx.AttachLedgerTransaction(tx.Id);
        db.PersonalTransactions.Add(personalTx);
        await db.SaveChangesAsync();
        return tx.Id;
    }

    async Task<long> SeedExpenseAsync(PersonalWallet wallet, PersonalCategory category, decimal amount, DateTime date, string? description)
    {
        var narration = string.IsNullOrWhiteSpace(description)
            ? $"Personal expense ({category.Name})"
            : $"Personal expense ({category.Name}): {description.Trim()}";

        var expenseAccountId = await GetOrCreateLedgerAccountAsync("Personal Finance Expenses", AccountType.Expense);
        var tx = LedgerTransaction.CreateDraft(narration, ReferenceType.Personal, wallet.Id);
        tx.AddEntry(expenseAccountId, debit: amount, credit: 0m);
        tx.AddEntry(wallet.LedgerAccountId, debit: 0m, credit: amount);
        db.LedgerTransactions.Add(tx);
        await db.SaveChangesAsync();

        var personalTx = PersonalTransaction.Create(wallet.Id, category.Id, amount, PersonalTransactionType.Expense, date, description);
        personalTx.AttachLedgerTransaction(tx.Id);
        db.PersonalTransactions.Add(personalTx);
        await db.SaveChangesAsync();
        return tx.Id;
    }

    async Task<long> SeedTransferAsync(PersonalWallet source, PersonalWallet destination, decimal amount, DateTime date, string? description)
    {
        var narration = string.IsNullOrWhiteSpace(description)
            ? $"Personal transfer: {source.Name} -> {destination.Name}"
            : $"Personal transfer: {source.Name} -> {destination.Name} ({description.Trim()})";

        var tx = LedgerTransaction.CreateDraft(narration, ReferenceType.Personal, source.Id);
        tx.AddEntry(destination.LedgerAccountId, debit: amount, credit: 0m);
        tx.AddEntry(source.LedgerAccountId, debit: 0m, credit: amount);
        db.LedgerTransactions.Add(tx);
        await db.SaveChangesAsync();

        var srcTx = PersonalTransaction.Create(source.Id, null, amount, PersonalTransactionType.Transfer, date,
            string.IsNullOrWhiteSpace(description) ? $"Transfer to {destination.Name}" : description);
        srcTx.AttachLedgerTransaction(tx.Id);

        var dstTx = PersonalTransaction.Create(destination.Id, null, amount, PersonalTransactionType.Transfer, date,
            string.IsNullOrWhiteSpace(description) ? $"Transfer from {source.Name}" : description);
        dstTx.AttachLedgerTransaction(tx.Id);

        db.PersonalTransactions.AddRange(srcTx, dstTx);
        await db.SaveChangesAsync();
        return tx.Id;
    }

    async Task<long?> SeedInvestmentContributionAsync(PersonalWallet wallet, Tranche tranche, decimal amount, DateTime date, string? description)
    {
        if (tranche.LiabilityAccountId <= 0)
            return null;

        var narration = string.IsNullOrWhiteSpace(description)
            ? $"Personal investment contribution to {tranche.TrancheCode}"
            : $"Personal investment contribution to {tranche.TrancheCode}: {description.Trim()}";

        var tx = LedgerTransaction.CreateDraft(narration, ReferenceType.Tranche, tranche.Id);
        tx.AddEntry(tranche.LiabilityAccountId, debit: amount, credit: 0m);
        tx.AddEntry(wallet.LedgerAccountId, debit: 0m, credit: amount);

        var record = PersonalInvestmentContribution.Create(wallet.Id, tranche.Id, amount, date, description, tx);
        db.LedgerTransactions.Add(tx);
        db.PersonalInvestmentContributions.Add(record);
        await db.SaveChangesAsync();
        return tx.Id;
    }

    // Wallets
    var bank = await CreateWalletAsync("GTBank Salary Account");
    var cash = await CreateWalletAsync("Cash Wallet");
    var savings = await CreateWalletAsync("Savings (Emergency Fund)");
    var wallets = new[] { bank, cash, savings };

    // Categories
    var salary = await GetOrCreateCategoryAsync("Salary", PersonalCategoryType.Income);
    var freelance = await GetOrCreateCategoryAsync("Freelance", PersonalCategoryType.Income);
    var bonus = await GetOrCreateCategoryAsync("Bonus", PersonalCategoryType.Income);
    var gifts = await GetOrCreateCategoryAsync("Gifts", PersonalCategoryType.Income);
    var interest = await GetOrCreateCategoryAsync("Interest", PersonalCategoryType.Income);

    var rent = await GetOrCreateCategoryAsync("Rent", PersonalCategoryType.Expense);
    var utilities = await GetOrCreateCategoryAsync("Utilities", PersonalCategoryType.Expense);
    var internet = await GetOrCreateCategoryAsync("Internet", PersonalCategoryType.Expense);
    var groceries = await GetOrCreateCategoryAsync("Groceries", PersonalCategoryType.Expense);
    var transport = await GetOrCreateCategoryAsync("Transport", PersonalCategoryType.Expense);
    var dining = await GetOrCreateCategoryAsync("Dining Out", PersonalCategoryType.Expense);
    var health = await GetOrCreateCategoryAsync("Health", PersonalCategoryType.Expense);
    var shopping = await GetOrCreateCategoryAsync("Shopping", PersonalCategoryType.Expense);
    var entertainment = await GetOrCreateCategoryAsync("Entertainment", PersonalCategoryType.Expense);
    var subscriptions = await GetOrCreateCategoryAsync("Subscriptions", PersonalCategoryType.Expense);
    var family = await GetOrCreateCategoryAsync("Family Support", PersonalCategoryType.Expense);
    var charity = await GetOrCreateCategoryAsync("Charity", PersonalCategoryType.Expense);
    var education = await GetOrCreateCategoryAsync("Education", PersonalCategoryType.Expense);
    var travel = await GetOrCreateCategoryAsync("Travel", PersonalCategoryType.Expense);

    // Budgets (monthly)
    var budgetSeeds = new (PersonalCategory Cat, decimal Amount)[]
    {
        (groceries, 120_000m),
        (dining, 70_000m),
        (transport, 55_000m),
        (shopping, 80_000m),
        (utilities, 45_000m),
    };

    var budgets = new List<Budget>();
    foreach (var (cat, amt) in budgetSeeds)
    {
        var existing = await db.PersonalBudgets.FirstOrDefaultAsync(b => b.CategoryId == cat.Id && b.Period == BudgetPeriod.Monthly);
        if (existing is not null)
        {
            budgets.Add(existing);
            continue;
        }

        var b = Budget.Create(cat.Id, amt, BudgetPeriod.Monthly);
        db.PersonalBudgets.Add(b);
        budgets.Add(b);
    }
    await db.SaveChangesAsync();

    // Goals
    if (!await db.PersonalGoals.AnyAsync())
    {
        var emergency = PersonalGoal.Create("Build Emergency Fund", 1_500_000m, nowUtc.AddMonths(10));
        emergency.Contribute(250_000m);

        var vacation = PersonalGoal.Create("Vacation Trip", 600_000m, nowUtc.AddMonths(7));
        vacation.Contribute(90_000m);

        db.PersonalGoals.AddRange(emergency, vacation);
        await db.SaveChangesAsync();
    }

    // Transactions for the last 6 months (inclusive)
    var monthStart = new DateTime(nowUtc.Year, nowUtc.Month, 1).AddMonths(-5);
    var transactionCount = 0;
    var contributionCount = 0;

    // Track expenses for budget tracking
    var expenseByCategoryMonth = new Dictionary<(long CategoryId, int Year, int Month), decimal>();
    void TrackExpense(PersonalCategory cat, DateTime date, decimal amount)
    {
        var key = (cat.Id, date.Year, date.Month);
        expenseByCategoryMonth[key] = (expenseByCategoryMonth.TryGetValue(key, out var v) ? v : 0m) + amount;
    }

    for (var i = 0; i < 6; i++)
    {
        var m = monthStart.AddMonths(i);
        var year = m.Year;
        var month = m.Month;

        // Income
        var salaryAmount = 620_000m + (i * 10_000m) + rng.Next(0, 15_000);
        await SeedIncomeAsync(bank, salary, salaryAmount, DayInMonth(m, 25), "Monthly salary");
        transactionCount++;

        if (rng.NextDouble() < 0.65)
        {
            var freelAmount = 45_000m + rng.Next(0, 95_000);
            await SeedIncomeAsync(bank, freelance, freelAmount, DayInMonth(m, rng.Next(8, 22)), "Side gig payment");
            transactionCount++;
        }

        if (i == 2)
        {
            await SeedIncomeAsync(bank, bonus, 80_000m, DayInMonth(m, 28), "Performance bonus");
            transactionCount++;
        }

        if (rng.NextDouble() < 0.40)
        {
            await SeedIncomeAsync(cash, gifts, 10_000m + rng.Next(0, 25_000), DayInMonth(m, rng.Next(1, 20)), "Gift/Refund");
            transactionCount++;
        }

        await SeedIncomeAsync(savings, interest, 1_500m + rng.Next(0, 2_500), DayInMonth(m, 30), "Savings interest");
        transactionCount++;

        // Savings transfer (after salary)
        var saveAmt = 140_000m + rng.Next(0, 45_000);
        await SeedTransferAsync(bank, savings, saveAmt, DayInMonth(m, 26), "Auto-save");
        transactionCount += 2;

        // Cash withdrawals (bank -> cash)
        var withdrawals = rng.Next(3, 6);
        for (var w = 0; w < withdrawals; w++)
        {
            var amt = 12_000m + rng.Next(0, 18_000);
            await SeedTransferAsync(bank, cash, amt, DayInMonth(m, rng.Next(2, 27)), "ATM withdrawal");
            transactionCount += 2;
        }

        // Fixed expenses
        var rentAmt = 210_000m + rng.Next(0, 25_000);
        var rentDate = DayInMonth(m, 3);
        await SeedExpenseAsync(bank, rent, rentAmt, rentDate, "House rent");
        TrackExpense(rent, rentDate, rentAmt);
        transactionCount++;

        var utilAmt = 22_000m + rng.Next(0, 20_000);
        await SeedExpenseAsync(bank, utilities, utilAmt, DayInMonth(m, 10), "Electricity / water");
        TrackExpense(utilities, DayInMonth(m, 10), utilAmt);
        transactionCount++;

        await SeedExpenseAsync(bank, internet, 18_500m, DayInMonth(m, 9), "Internet subscription");
        TrackExpense(internet, DayInMonth(m, 9), 18_500m);
        transactionCount++;

        await SeedExpenseAsync(bank, subscriptions, 6_900m, DayInMonth(m, 7), "Streaming + music");
        TrackExpense(subscriptions, DayInMonth(m, 7), 6_900m);
        transactionCount++;

        // Variable lifestyle expenses
        var groceryTrips = rng.Next(4, 7);
        for (var g = 0; g < groceryTrips; g++)
        {
            var amt = 9_000m + rng.Next(0, 22_000);
            var d = DayInMonth(m, rng.Next(1, 28));
            await SeedExpenseAsync(bank, groceries, amt, d, "Groceries");
            TrackExpense(groceries, d, amt);
            transactionCount++;
        }

        var rides = rng.Next(10, 16);
        for (var r = 0; r < rides; r++)
        {
            var amt = 1_200m + rng.Next(0, 3_800);
            var d = DayInMonth(m, rng.Next(1, 28));
            await SeedExpenseAsync(cash, transport, amt, d, "Transport");
            TrackExpense(transport, d, amt);
            transactionCount++;
        }

        var eatOut = rng.Next(4, 9);
        for (var e = 0; e < eatOut; e++)
        {
            var amt = 2_800m + rng.Next(0, 11_000);
            var d = DayInMonth(m, rng.Next(1, 28));
            await SeedExpenseAsync(bank, dining, amt, d, "Lunch / dinner");
            TrackExpense(dining, d, amt);
            transactionCount++;
        }

        if (rng.NextDouble() < 0.60)
        {
            var amt = 12_000m + rng.Next(0, 30_000);
            var d = DayInMonth(m, rng.Next(12, 28));
            await SeedExpenseAsync(bank, shopping, amt, d, "Shopping / household");
            TrackExpense(shopping, d, amt);
            transactionCount++;
        }

        if (rng.NextDouble() < 0.45)
        {
            var amt = 8_000m + rng.Next(0, 22_000);
            var d = DayInMonth(m, rng.Next(5, 24));
            await SeedExpenseAsync(bank, health, amt, d, "Pharmacy / clinic");
            TrackExpense(health, d, amt);
            transactionCount++;
        }

        if (rng.NextDouble() < 0.55)
        {
            var amt = 15_000m + rng.Next(0, 45_000);
            var d = DayInMonth(m, rng.Next(15, 28));
            await SeedExpenseAsync(bank, family, amt, d, "Family support");
            TrackExpense(family, d, amt);
            transactionCount++;
        }

        if (rng.NextDouble() < 0.30)
        {
            var amt = 5_000m + rng.Next(0, 10_000);
            var d = DayInMonth(m, rng.Next(1, 28));
            await SeedExpenseAsync(cash, charity, amt, d, "Giving");
            TrackExpense(charity, d, amt);
            transactionCount++;
        }

        if (i == 4)
        {
            var amt = 95_000m;
            var d = DayInMonth(m, 18);
            await SeedExpenseAsync(bank, education, amt, d, "Short course");
            TrackExpense(education, d, amt);
            transactionCount++;
        }

        if (i == 5)
        {
            var amt = 180_000m;
            var d = DayInMonth(m, 20);
            await SeedExpenseAsync(bank, travel, amt, d, "Trip booking");
            TrackExpense(travel, d, amt);
            transactionCount++;
        }

        var fun = rng.Next(1, 3);
        for (var f = 0; f < fun; f++)
        {
            var amt = 6_000m + rng.Next(0, 18_000);
            var d = DayInMonth(m, rng.Next(1, 28));
            await SeedExpenseAsync(cash, entertainment, amt, d, "Hanging out");
            TrackExpense(entertainment, d, amt);
            transactionCount++;
        }

        // Investment contributions (monthly)
        var tranche = tranches.Count > 0 ? tranches[rng.Next(0, tranches.Count)] : null;
        if (tranche is not null)
        {
            var invAmt = 35_000m + rng.Next(0, 65_000);
            var id = await SeedInvestmentContributionAsync(bank, tranche, invAmt, DayInMonth(m, 27), "Monthly investment");
            if (id.HasValue)
                contributionCount++;
        }
    }

    // Budget tracking (based on seeded expenses)
    var trackingRows = 0;
    foreach (var b in budgets)
    {
        for (var i = 0; i < 6; i++)
        {
            var m = monthStart.AddMonths(i);
            var key = (b.CategoryId, m.Year, m.Month);
            var spent = expenseByCategoryMonth.TryGetValue(key, out var total) ? total : 0m;

            var existing = await db.PersonalBudgetTracking.FirstOrDefaultAsync(t => t.BudgetId == b.Id && t.Year == m.Year && t.Month == m.Month);
            if (existing is not null)
                continue;

            var t = BudgetTracking.CreateForPeriod(b.Id, m.Year, m.Month, b.Amount);
            if (spent > 0m)
                t.ApplyExpense(spent, b.Amount);

            db.PersonalBudgetTracking.Add(t);
            trackingRows++;
        }
    }
    await db.SaveChangesAsync();

    var ledgerAccountsAfter = await db.LedgerAccounts.CountAsync();
    var goalsAfter = await db.PersonalGoals.CountAsync();

    return (
        Wallets: wallets.Length,
        Categories: await db.PersonalCategories.CountAsync(),
        Transactions: await db.PersonalTransactions.CountAsync(),
        Contributions: await db.PersonalInvestmentContributions.CountAsync(),
        Budgets: budgets.Count,
        BudgetTrackingRows: trackingRows,
        Goals: goalsAfter,
        LedgerAccountsAdded: ledgerAccountsAfter - ledgerAccountsBefore);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
static void Banner(string title)
{
    Console.WriteLine();
    Console.WriteLine($"━━━ {title} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
}

static void Step(string label)
    => Console.Write($"  {label,-38}");

static void Done(int count, string? detail = null)
    => Console.WriteLine(detail is null ? $"{count} created." : $"{count} created  ({detail}).");
