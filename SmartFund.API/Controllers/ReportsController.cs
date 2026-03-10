using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.Application.Interfaces;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/reports")]
    public sealed class ReportsController : ControllerBase
    {
        private readonly IReportingService _reports;

        public ReportsController(IReportingService reports) => _reports = reports;

        [HttpGet("investor-exposure")]
        public async Task<IActionResult> InvestorExposure(CancellationToken ct)
        {
            var rows = await _reports.GetInvestorExposureAsync(ct);
            return Ok(rows);
        }

        [HttpGet("upcoming-payouts")]
        public async Task<IActionResult> UpcomingPayouts([FromQuery] int daysAhead, CancellationToken ct)
        {
            var rows = await _reports.GetUpcomingPayoutsAsync(DateTime.UtcNow, daysAhead, ct);
            return Ok(rows);
        }

        [HttpGet("insurance-buffer")]
        public async Task<IActionResult> InsuranceBuffer(CancellationToken ct)
        {
            var report = await _reports.GetInsuranceBufferAsync(ct);
            return Ok(report);
        }
    }
}
