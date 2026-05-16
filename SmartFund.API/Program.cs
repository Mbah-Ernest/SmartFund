using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SmartFund.API.Services;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Interfaces.Stocks;
using SmartFund.Application.Services.Agent;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Application.Services.Stocks;
using SmartFund.Application.UseCases.Tranches;
using SmartFund.Infrastructure.BankSync;
using SmartFund.Infrastructure.Stocks;
using SmartFund.Persistence.DbContext;
using SmartFund.Persistence.Repositories;
using SmartFund.Persistence.Repositories.Stocks;
using SmartFund.Persistence.Reporting;
using SmartFund.Application.Services;
using System.Security.Authentication;
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
            .SetIsOriginAllowed(origin =>
            {
                var uri = new Uri(origin);
                return uri.Host == "localhost" || uri.Host == "127.0.0.1";
            })
            .AllowAnyHeader()
            .AllowAnyMethod());
});

builder.Services.AddDbContext<SmartFundDbContext>(options =>
    options
        .UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"))
        .ConfigureWarnings(w =>
        {
            if (builder.Environment.IsDevelopment())
                w.Log(RelationalEventId.PendingModelChangesWarning);
        }));

builder.Services.AddScoped<ILedgerTransactionRepository, LedgerTransactionRepository>();
builder.Services.AddScoped<ILedgerSequenceGenerator, LedgerSequenceGenerator>();

builder.Services.AddScoped<IReportingService, ReportingService>();
builder.Services.AddScoped<IPersonalFinanceReportService, PersonalFinanceReportService>();
builder.Services.AddScoped<IPersonalFinanceDashboardService, PersonalFinanceDashboardService>();

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
builder.Services.AddScoped<IPersonalGoalRepository, PersonalGoalRepository>();
builder.Services.AddScoped<IPersonalBudgetRepository, PersonalBudgetRepository>();
builder.Services.AddScoped<IPersonalBudgetTrackingRepository, PersonalBudgetTrackingRepository>();
builder.Services.AddScoped<IConnectedBankAccountRepository, ConnectedBankAccountRepository>();
builder.Services.AddScoped<IBankImportedTransactionRepository, BankImportedTransactionRepository>();
builder.Services.AddScoped<IBankCategorizationRuleRepository, BankCategorizationRuleRepository>();
builder.Services.AddScoped<IPersonalFinanceSettingsRepository, PersonalFinanceSettingsRepository>();

builder.Services.AddScoped<IAuditRepository, AuditRepository>();
builder.Services.AddScoped<IAuditService, SmartFund.Application.Services.AuditService>();

// Stock Intelligence
builder.Services.AddScoped<IStockRepository, StockRepository>();
builder.Services.AddScoped<IPriceRepository, PriceRepository>();
builder.Services.AddScoped<IAiBriefRepository, AiBriefRepository>();
builder.Services.AddScoped<IStockWatchlistRepository, StockWatchlistRepository>();
builder.Services.AddScoped<TechnicalIndicatorService>();
builder.Services.AddScoped<IAiBriefOrchestrator, AiBriefOrchestrator>();

builder.Services.AddScoped<IPersonalWalletService, PersonalWalletService>();
builder.Services.AddScoped<IPersonalTransactionService, PersonalTransactionService>();

// User / auth
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<ILoanApplicationRepository, LoanApplicationRepository>();
builder.Services.AddScoped<ILoanApplicantProfileRepository, LoanApplicantProfileRepository>();
builder.Services.AddScoped<SmartFund.Application.Interfaces.IPasswordHasher, SmartFund.API.Services.BcryptPasswordHasher>();
builder.Services.AddScoped<SmartFund.Application.Services.UserAuthService>();
builder.Services.AddScoped<SmartFund.Application.Interfaces.IUserCreditInsightsService, SmartFund.Application.Services.UserCreditInsightsService>();

// Loan use cases
builder.Services.AddScoped<SmartFund.Application.UseCases.Loans.SubmitLoanApplicantProfile>();
builder.Services.AddScoped<SmartFund.Application.UseCases.Loans.ReviewLoanApplicantProfile>();
builder.Services.AddScoped<SmartFund.Application.UseCases.Loans.SubmitLoanApplication>();
builder.Services.AddScoped<SmartFund.Application.UseCases.Loans.ReviewLoanApplication>();
builder.Services.AddScoped<SmartFund.Application.UseCases.Loans.DisburseLoanApplication>();

// Personal Finance use cases
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.ReconcileWallet>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.BulkReconcileWalletsUseCase>();

// Personal Debt use cases
builder.Services.AddScoped<SmartFund.Application.Interfaces.IPersonalDebtRepository, SmartFund.Persistence.Repositories.PersonalDebtRepository>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.CreatePersonalDebt>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.RecordDebtPayment>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.UpdatePersonalDebt>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.MarkDebtForgiven>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.DeletePersonalDebt>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.GetDebtInsights>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.GetGoalInsights>();

// Income Schedule use cases
builder.Services.AddScoped<SmartFund.Application.Interfaces.IIncomeScheduleRepository, SmartFund.Persistence.Repositories.IncomeScheduleRepository>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.CreateIncomeScheduleItem>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.UpdateIncomeScheduleItem>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.DeleteIncomeScheduleItem>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.MarkIncomeReceived>();
builder.Services.AddScoped<SmartFund.Application.UseCases.PersonalFinance.GetIncomeScheduleSummary>();

// Bank sync + categorization
builder.Services.Configure<MonoOptions>(builder.Configuration.GetSection("Mono"));
builder.Services.AddHttpClient<MonoApiClient>()
    .ConfigurePrimaryHttpMessageHandler(() =>
    {
        var handler = new HttpClientHandler
        {
            SslProtocols = SslProtocols.Tls12 | SslProtocols.Tls13
        };

        // Dev-only escape hatch for machines behind TLS-inspecting proxies with an untrusted root CA.
        // Prefer installing/trusting the proxy root cert instead of enabling this.
        var skipTls = builder.Configuration.GetValue<bool>("Mono:SkipTlsVerification");
        if (builder.Environment.IsDevelopment() && skipTls)
        {
            handler.ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator;
        }

        return handler;
    });
builder.Services.AddScoped<SmartFund.Application.Interfaces.IMonoApiClient, MonoApiClient>();
builder.Services.AddScoped<CategorizationEngine>();
builder.Services.AddScoped<BankInboxService>();
builder.Services.AddScoped<TransferDetectionService>();
builder.Services.AddScoped<BankSyncService>();
builder.Services.AddScoped<BankLinkingService>();
builder.Services.AddHostedService<MonoSyncJob>();

// Agent services
builder.Services.AddScoped<IPendingAgentActionRepository, PendingAgentActionRepository>();
builder.Services.AddScoped<AgentQueryService>();
builder.Services.AddScoped<AgentActionService>();

// Groq is OpenAI-compatible. Support the common env-var names used in Groq docs
// (GROQ_API_KEY / GROQ_MODEL) in addition to our existing config keys.
// Note: .NET config binding maps env var `Groq__ApiKey` -> config key `Groq:ApiKey`.
var groqApiKey =
    builder.Configuration["GROQ_API_KEY"] ??
    builder.Configuration["Groq:ApiKey"] ??
    "";

 var groqModel =
     builder.Configuration["GROQ_MODEL"] ??
     builder.Configuration["Groq:Model"] ??
     "llama-3.3-70b-versatile";

 var groqBaseUrl =
     builder.Configuration["GROQ_BASE_URL"] ??
     builder.Configuration["Groq:BaseUrl"] ??
     "https://api.groq.com/openai/v1";

var missingGroqKeyInDev = builder.Environment.IsDevelopment() && string.IsNullOrWhiteSpace(groqApiKey);

builder.Services.AddHttpClient<AgentChatService>();
builder.Services.AddScoped<AgentChatService>(sp =>
    new AgentChatService(
        sp.GetRequiredService<IHttpClientFactory>().CreateClient(nameof(AgentChatService)),
        sp.GetRequiredService<AgentQueryService>(),
        sp.GetRequiredService<AgentActionService>(),
        sp.GetRequiredService<SmartFund.Application.UseCases.PersonalFinance.GetGoalInsights>(),
        groqApiKey,
        groqModel,
        groqBaseUrl));

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

if (missingGroqKeyInDev)
{
    app.Logger.LogWarning("Groq API key is not configured. Set environment variable 'GROQ_API_KEY' (or 'Groq__ApiKey') or user-secrets key 'Groq:ApiKey' to enable AI features.");
}

// Ensure the database schema is up-to-date on startup.
// This prevents runtime errors like "Invalid object name" after introducing new migrations
// and bootstraps a fresh container deployment without a separate migrate step.
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

            var usersTableExists = TableExists(db, "Users");

            // If a table doesn't exist yet, leave the corresponding migration unapplied
            // so that `Migrate()` will create it.
            var toMarkApplied = allMigrations
                .Where(m => auditTableExists || !m.Contains("AddAuditEntries", StringComparison.OrdinalIgnoreCase))
                .Where(m => usersTableExists || !m.Contains("AddMultiUserSupport", StringComparison.OrdinalIgnoreCase))
                .ToList();

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
