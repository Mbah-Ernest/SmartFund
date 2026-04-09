using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Application.UseCases.PersonalFinance;
using SmartFund.Domain.PersonalFinance.Entities;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-debts")]
    public sealed class PersonalDebtController : SmartFundControllerBase
    {
        private readonly IPersonalDebtRepository _debts;
        private readonly CreatePersonalDebt _create;
        private readonly RecordDebtPayment _recordPayment;
        private readonly UpdatePersonalDebt _update;
        private readonly MarkDebtForgiven _forgive;
        private readonly DeletePersonalDebt _delete;
        private readonly GetDebtInsights _insights;

        public PersonalDebtController(
            IPersonalDebtRepository debts,
            CreatePersonalDebt create,
            RecordDebtPayment recordPayment,
            UpdatePersonalDebt update,
            MarkDebtForgiven forgive,
            DeletePersonalDebt delete,
            GetDebtInsights insights)
        {
            _debts = debts;
            _create = create;
            _recordPayment = recordPayment;
            _update = update;
            _forgive = forgive;
            _delete = delete;
            _insights = insights;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDebtRequest body, CancellationToken ct)
        {
            var debt = await _create.ExecuteAsync(
                GetCurrentUserId(),
                body.CreditorName,
                body.PrincipalAmount,
                body.TotalAmountDue,
                body.DueDate,
                body.Description,
                ct);

            return CreatedAtAction(nameof(GetById), new { id = debt.Id }, MapDebt(debt));
        }

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            var list = await _debts.ListByUserAsync(GetCurrentUserId(), ct);
            return Ok(list.Select(MapDebt));
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> GetById(long id, CancellationToken ct)
        {
            var debt = await _debts.GetByIdForUserAsync(id, GetCurrentUserId(), ct);
            if (debt is null) return NotFound();
            return Ok(MapDebt(debt));
        }

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateDebtRequest body, CancellationToken ct)
        {
            var debt = await _update.ExecuteAsync(
                GetCurrentUserId(), id,
                body.CreditorName, body.TotalAmountDue, body.DueDate, body.Description,
                ct);

            return Ok(MapDebt(debt));
        }

        [HttpPost("{id:long}/payments")]
        public async Task<IActionResult> RecordPayment(long id, [FromBody] RecordPaymentRequest body, CancellationToken ct)
        {
            var (debt, payment) = await _recordPayment.ExecuteAsync(
                GetCurrentUserId(), id, body.Amount, body.PaidOn, body.Note, ct);

            return Ok(new
            {
                payment = new
                {
                    payment.Id,
                    payment.Amount,
                    payment.PaidOn,
                    payment.Note,
                    payment.RecordedAt
                },
                updatedDebt = MapDebt(debt)
            });
        }

        [HttpPatch("{id:long}/forgive")]
        public async Task<IActionResult> Forgive(long id, CancellationToken ct)
        {
            var debt = await _forgive.ExecuteAsync(GetCurrentUserId(), id, ct);
            return Ok(MapDebt(debt));
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, [FromBody] DeleteDebtRequest body, CancellationToken ct)
        {
            if (body is null || string.IsNullOrWhiteSpace(body.Pin))
                return BadRequest(new { error = "PIN is required." });

            await _delete.ExecuteAsync(GetCurrentUserId(), id, body.Pin, ct);
            return NoContent();
        }

        [HttpGet("insights")]
        public async Task<IActionResult> Insights(CancellationToken ct)
        {
            var result = await _insights.ExecuteAsync(GetCurrentUserId(), ct);
            return Ok(new
            {
                result.TotalOwed,
                result.TotalInterest,
                result.TotalPaid,
                result.PercentPaid,
                result.AvgMonthlyIncome,
                result.AvgMonthlyExpenses,
                result.AvgMonthlySavings,
                result.SavingsInsufficient,
                result.MonthlyDebtBurden,
                result.BurdenPercent,
                result.DebtFreeDate,
                savingsTargets = result.SavingsTargets.Select(s => new
                {
                    s.DebtId,
                    s.CreditorName,
                    s.DailySavingsTarget,
                    s.WeeklySavingsTarget
                }),
                coverageItems = result.CoverageItems.Select(c => new
                {
                    c.DebtId,
                    c.CreditorName,
                    c.RemainingBalance,
                    c.DaysUntilDue,
                    c.ProjectedSavingsByDue,
                    c.CanCover
                }),
                urgencyRanking = result.UrgencyRanking.Select(u => new
                {
                    u.DebtId,
                    u.CreditorName,
                    u.RemainingBalance,
                    u.DaysUntilDue,
                    u.UrgencyBadge
                })
            });
        }

        private static object MapDebt(PersonalDebt d) => new
        {
            d.Id,
            d.UserId,
            d.CreditorName,
            d.PrincipalAmount,
            d.TotalAmountDue,
            d.TotalPaid,
            d.RemainingBalance,
            d.InterestAmount,
            d.ProgressPercent,
            d.DueDate,
            d.DaysUntilDue,
            d.Description,
            status = d.Status.ToString(),
            d.CreatedAt,
            d.UpdatedAt,
            payments = d.Payments.OrderByDescending(p => p.PaidOn).Select(p => new
            {
                p.Id,
                p.Amount,
                p.PaidOn,
                p.Note,
                p.RecordedAt
            })
        };
    }

    public record CreateDebtRequest(
        string CreditorName,
        decimal PrincipalAmount,
        decimal TotalAmountDue,
        DateTime DueDate,
        string? Description);

    public record UpdateDebtRequest(
        string CreditorName,
        decimal TotalAmountDue,
        DateTime DueDate,
        string? Description);

    public record RecordPaymentRequest(
        decimal Amount,
        DateTime PaidOn,
        string? Note);

    public record DeleteDebtRequest(string Pin);
}
