using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Application.UseCases.Tranches;
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

builder.Services.AddScoped<IPersonalWalletService, PersonalWalletService>();
builder.Services.AddScoped<IPersonalTransactionService, PersonalTransactionService>();
builder.Services.AddScoped<IPersonalInvestmentContributionService, PersonalInvestmentContributionService>();

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

// Add OpenAPI/Swagger services
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

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
