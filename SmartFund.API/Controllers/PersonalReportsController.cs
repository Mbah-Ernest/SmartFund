using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Reporting.PersonalFinance;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-reports")]
    public sealed class PersonalReportsController : ControllerBase
    {
        private readonly IPersonalFinanceDashboardService _dashboard;
        private readonly IPersonalFinanceReportService _reports;

        public PersonalReportsController(
            IPersonalFinanceDashboardService dashboard,
            IPersonalFinanceReportService reports)
        {
            _dashboard = dashboard;
            _reports = reports;
        }

        [HttpGet("dashboard")]
        public Task<PersonalFinanceDashboardDto> Dashboard(CancellationToken ct) =>
            _dashboard.GetAsync(DateTime.UtcNow, ct);

        [HttpGet("monthly-income")]
        public Task<List<MonthlyCategoryAmountRow>> MonthlyIncome(CancellationToken ct) =>
            _reports.MonthlyIncomeReportAsync(ct);

        [HttpGet("monthly-expenses")]
        public Task<List<MonthlyCategoryAmountRow>> MonthlyExpenses(CancellationToken ct) =>
            _reports.MonthlyExpenseReportAsync(ct);

        [HttpGet("cashflow")]
        public Task<List<CashFlowRow>> CashFlow(CancellationToken ct) =>
            _reports.CashFlowReportAsync(ct);

        [HttpGet("wallet-balances")]
        public Task<List<WalletBalanceRow>> WalletBalances(CancellationToken ct) =>
            _reports.WalletBalanceReportAsync(ct);

        [HttpGet("runway")]
        public Task<CashRunwayDto> Runway(CancellationToken ct) =>
            _dashboard.GetCashRunwayAsync(DateTime.UtcNow, ct);
    }
}
