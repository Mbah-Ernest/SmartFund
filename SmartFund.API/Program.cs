using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Application.UseCases.Tranches;
using SmartFund.Infrastructure.BankSync;
using SmartFund.Persistence.DbContext;
using SmartFund.Persistence.Repositories;
using SmartFund.Persistence.Reporting;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers(options =>
{
    options.Filters.Add<SmartFund.API.Filters.DomainExceptionFilter>();
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var issuer = builder.Configuration["Jwt:Issuer"];
        var audience = builder.Configuration["Jwt:Audience"];
        var key = builder.Configuration["Jwt:Key"];

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key!)),
            ValidateIssuer = true,
            ValidIssuer = issuer,
            ValidateAudience = true,
            ValidAudience = audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("SmartFundWeb", policy =>
        policy
            .WithOrigins(
                "http://localhost:5173", "https://localhost:5173",
                "http://localhost:4173", "https://localhost:4173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddDbContext<SmartFundDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ILedgerTransactionRepository, LedgerTransactionRepository>();
builder.Services.AddScoped<ILedgerSequenceGenerator, LedgerSequenceGenerator>();

builder.Services.AddScoped<IReportingService, ReportingService>();
builder.Services.AddScoped<IPersonalFinanceReportService, PersonalFinanceReportService>();
builder.Services.AddScoped<IPersonalFinanceDashboardService, PersonalFinanceDashboardService>();

builder.Services.AddScoped<SmartFund.Application.Interfaces.ILedgerAccountRepository, SmartFund.Persistence.Repositories.LedgerAccountRepository>();

// Repos + generators it depends on
builder.Services.AddScoped<ITrancheRepository, TrancheRepository>();
builder.Services.AddScoped<IInvestorRepository, InvestorRepository>();
builder.Services.AddScoped<IDealRepository, DealRepository>();
builder.Services.AddScoped<IInsuranceWalletRepository, InsuranceWalletRepository>();
builder.Services.AddScoped<IAgreementRepository, AgreementRepository>();
builder.Services.AddScoped<ILedgerAccountRepository, LedgerAccountRepository>();
builder.Services.AddScoped<ITrancheCodeGenerator, TrancheCodeGenerator>();

builder.Services.AddScoped<IPersonalWalletRepository, PersonalWalletRepository>();
builder.Services.AddScoped<IPersonalCategoryRepository, PersonalCategoryRepository>();
builder.Services.AddScoped<IPersonalTransactionRepository, PersonalTransactionRepository>();
builder.Services.AddScoped<IPersonalInvestmentContributionRepository, PersonalInvestmentContributionRepository>();
builder.Services.AddScoped<IPersonalBudgetRepository, PersonalBudgetRepository>();
builder.Services.AddScoped<IPersonalBudgetTrackingRepository, PersonalBudgetTrackingRepository>();
builder.Services.AddScoped<IConnectedBankAccountRepository, ConnectedBankAccountRepository>();
builder.Services.AddScoped<IBankImportedTransactionRepository, BankImportedTransactionRepository>();
builder.Services.AddScoped<IBankCategorizationRuleRepository, BankCategorizationRuleRepository>();

builder.Services.AddScoped<IAuditRepository, AuditRepository>();
builder.Services.AddScoped<IAuditService, SmartFund.Application.Services.AuditService>();

builder.Services.AddScoped<IPersonalWalletService, PersonalWalletService>();
builder.Services.AddScoped<IPersonalTransactionService, PersonalTransactionService>();
builder.Services.AddScoped<IPersonalInvestmentContributionService, PersonalInvestmentContributionService>();

// Bank sync + categorization
builder.Services.Configure<MonoOptions>(builder.Configuration.GetSection("Mono"));
builder.Services.AddHttpClient<MonoApiClient>();
builder.Services.AddScoped<SmartFund.Application.Interfaces.IMonoApiClient, MonoApiClient>();
builder.Services.AddScoped<CategorizationEngine>();
builder.Services.AddScoped<BankInboxService>();
builder.Services.AddScoped<BankSyncService>();
builder.Services.AddScoped<BankLinkingService>();
builder.Services.AddHostedService<MonoSyncJob>();

// Use case
builder.Services.AddScoped<CreateTranche>();
builder.Services.AddScoped<ListTranches>();
builder.Services.AddScoped<FundTranche>();
builder.Services.AddScoped<PayTrancheInvestor>();

builder.Services.AddScoped<SmartFund.Application.UseCases.Agreements.SignTrancheAgreement>();

builder.Services.AddScoped<SmartFund.Application.UseCases.Insurance.FundInsuranceWallet>();
builder.Services.AddScoped<SmartFund.Application.UseCases.Insurance.UseInsuranceWallet>();

builder.Services.AddScoped<SmartFund.Application.UseCases.Deals.CreateDeal>();
builder.Services.AddScoped<SmartFund.Application.UseCases.Deals.ListDeals>();
builder.Services.AddScoped<SmartFund.Application.UseCases.Deals.GetDeal>();

builder.Services.AddHttpClient();

// Add OpenAPI/Swagger services
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Ensure the database schema is up-to-date in development.
// This prevents runtime errors like "Invalid object name" after introducing new migrations.
if (app.Environment.IsDevelopment())
{
    try
    {
        using var scope = app.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<SmartFundDbContext>();

        static bool TableExists(SmartFundDbContext ctx, string tableName)
        {
            var conn = ctx.Database.GetDbConnection();
            var wasClosed = conn.State != System.Data.ConnectionState.Open;
            if (wasClosed)
                conn.Open();

            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @p0";

                var p = cmd.CreateParameter();
                p.ParameterName = "@p0";
                p.Value = tableName;
                cmd.Parameters.Add(p);

                var result = cmd.ExecuteScalar();
                return result is not null;
            }
            finally
            {
                if (wasClosed)
                    conn.Close();
            }
        }

        // If the database was created outside EF migrations (or the history table was deleted),
        // `Migrate()` will try to replay the entire migration chain and fail because tables already exist.
        // In that case, we baseline the history table to the current set of migrations, then apply pending.
        var history = db.GetService<IHistoryRepository>();

        var historyExists = history.Exists();
        var hasAppliedMigrations = historyExists && history.GetAppliedMigrations().Count > 0;
        var looksLikeExistingDb = TableExists(db, "LedgerTransactions");

        var needsBaseline = (!historyExists && looksLikeExistingDb) || (historyExists && !hasAppliedMigrations && looksLikeExistingDb);

        if (needsBaseline)
        {
            if (!historyExists)
                db.Database.ExecuteSqlRaw(history.GetCreateScript());

            var productVersion = ProductInfo.GetVersion();

            var allMigrations = db.Database.GetMigrations().ToList();
            var auditTableExists = TableExists(db, "AuditEntries");

            // If the audit table doesn't exist yet, leave the corresponding migration unapplied
            // so that `Migrate()` will create it.
            var toMarkApplied = auditTableExists
                ? allMigrations
                : allMigrations.Where(m => !m.Contains("AddAuditEntries", StringComparison.OrdinalIgnoreCase)).ToList();

            foreach (var migrationId in toMarkApplied)
            {
                db.Database.ExecuteSqlRaw(
                    "INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES ({0}, {1})",
                    migrationId,
                    productVersion);
            }
        }

        db.Database.Migrate();
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Database migration failed on startup. The API will still start, but data endpoints may fail until the database is available.");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("SmartFundWeb");

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
