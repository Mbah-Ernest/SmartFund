using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Application.UseCases.PersonalFinance;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/income-schedule")]
    public sealed class IncomeScheduleController : SmartFundControllerBase
    {
        private readonly IIncomeScheduleRepository _repo;
        private readonly CreateIncomeScheduleItem _create;
        private readonly UpdateIncomeScheduleItem _update;
        private readonly DeleteIncomeScheduleItem _delete;
        private readonly MarkIncomeReceived _markReceived;
        private readonly GetIncomeScheduleSummary _summary;

        public IncomeScheduleController(
            IIncomeScheduleRepository repo,
            CreateIncomeScheduleItem create,
            UpdateIncomeScheduleItem update,
            DeleteIncomeScheduleItem delete,
            MarkIncomeReceived markReceived,
            GetIncomeScheduleSummary summary)
        {
            _repo = repo;
            _create = create;
            _update = update;
            _delete = delete;
            _markReceived = markReceived;
            _summary = summary;
        }

        [HttpGet]
        public async Task<IActionResult> List([FromQuery] bool includeCompleted = false, CancellationToken ct = default)
        {
            var userId = GetCurrentUserId();
            var items = includeCompleted
                ? await _repo.ListByUserAsync(userId, ct)
                : await _repo.ListActiveByUserAsync(userId, ct);

            return Ok(items.Select(MapItem));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateIncomeScheduleRequest body, CancellationToken ct)
        {
            if (!Enum.TryParse<IncomeScheduleKind>(body.Kind, ignoreCase: true, out var kind))
                return BadRequest(new { error = $"Invalid Kind: {body.Kind}" });

            if (!TryParseDirection(body.Direction, out var direction))
                return BadRequest(new { error = $"Invalid Direction: {body.Direction}" });

            if (!TryParseRecurrenceInterval(body.RecurrenceInterval, out var interval))
                return BadRequest(new { error = $"Invalid RecurrenceInterval: {body.RecurrenceInterval}" });

            var item = await _create.ExecuteAsync(
                GetCurrentUserId(), body.Label, body.Amount, direction,
                kind,
                body.NextExpectedDate, interval, body.EndDate, body.Notes, ct);

            return CreatedAtAction(nameof(List), new { }, MapItem(item));
        }

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdateIncomeScheduleRequest body, CancellationToken ct)
        {
            if (!Enum.TryParse<IncomeScheduleKind>(body.Kind, ignoreCase: true, out var kind))
                return BadRequest(new { error = $"Invalid Kind: {body.Kind}" });

            if (!TryParseDirection(body.Direction, out var direction))
                return BadRequest(new { error = $"Invalid Direction: {body.Direction}" });

            if (!TryParseRecurrenceInterval(body.RecurrenceInterval, out var interval))
                return BadRequest(new { error = $"Invalid RecurrenceInterval: {body.RecurrenceInterval}" });

            var item = await _update.ExecuteAsync(
                GetCurrentUserId(), id, body.Label, body.Amount, direction,
                kind,
                interval, body.NextExpectedDate, body.EndDate, body.Notes, ct);

            return Ok(MapItem(item));
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            await _delete.ExecuteAsync(GetCurrentUserId(), id, ct);
            return NoContent();
        }

        [HttpPost("{id:long}/mark-received")]
        public async Task<IActionResult> MarkReceived(long id, CancellationToken ct)
        {
            var item = await _markReceived.ExecuteAsync(GetCurrentUserId(), id, ct);
            return Ok(MapItem(item));
        }

        [HttpGet("summary")]
        public async Task<IActionResult> Summary(CancellationToken ct)
        {
            var result = await _summary.ExecuteAsync(GetCurrentUserId(), ct);
            return Ok(new
            {
                result.TotalActiveItems,
                result.ExpectedIncomeThisMonthNaira,
                result.ExpectedExpenseThisMonthNaira,
                result.ProjectedNetThisMonthNaira,
                result.ExpectedIncomeNext30DaysNaira,
                result.ExpectedExpenseNext30DaysNaira,
                result.ProjectedNetNext30DaysNaira,
                result.ExpectedIncomeNext90DaysNaira,
                result.ExpectedExpenseNext90DaysNaira,
                result.ProjectedNetNext90DaysNaira,
                result.RecurringIncomeTotalNaira,
                result.RecurringExpenseTotalNaira,
                result.OneTimeIncomeTotalNaira,
                result.OneTimeExpenseTotalNaira,
                result.ExpectedThisMonthNaira,
                result.ExpectedNext30DaysNaira,
                result.ExpectedNext90DaysNaira,
                result.RecurringTotalNaira,
                result.OneTimeTotalNaira,
            });
        }

        private static object MapItem(IncomeScheduleItem item) => new
        {
            item.Id,
            item.UserId,
            item.Label,
            item.Amount,
            direction = item.Direction.ToString(),
            kind = item.Kind.ToString(),
            recurrenceInterval = item.RecurrenceInterval?.ToString(),
            item.NextExpectedDate,
            item.EndDate,
            item.Notes,
            status = item.Status.ToString(),
            item.CreatedAt,
            item.UpdatedAt,
        };

        private static bool TryParseRecurrenceInterval(string? raw, out IncomeRecurrenceInterval? interval)
        {
            interval = null;

            if (string.IsNullOrWhiteSpace(raw))
                return true;

            var value = raw.Trim();

            if (Enum.TryParse<IncomeRecurrenceInterval>(value, ignoreCase: true, out var direct))
            {
                interval = direct;
                return true;
            }

            if (int.TryParse(value, out var numeric) && Enum.IsDefined(typeof(IncomeRecurrenceInterval), numeric))
            {
                interval = (IncomeRecurrenceInterval)numeric;
                return true;
            }

            var normalized = value
                .Replace("-", string.Empty, StringComparison.Ordinal)
                .Replace("_", string.Empty, StringComparison.Ordinal)
                .Replace(" ", string.Empty, StringComparison.Ordinal)
                .ToLowerInvariant();

            interval = normalized switch
            {
                "daily" or "everyday" => IncomeRecurrenceInterval.Daily,
                "weekly" => IncomeRecurrenceInterval.Weekly,
                "biweekly" or "fortnightly" => IncomeRecurrenceInterval.BiWeekly,
                "monthly" => IncomeRecurrenceInterval.Monthly,
                "quarterly" => IncomeRecurrenceInterval.Quarterly,
                "annually" or "yearly" => IncomeRecurrenceInterval.Annually,
                _ => null
            };

            return interval.HasValue;
        }

        private static bool TryParseDirection(string? raw, out IncomeScheduleDirection direction)
        {
            direction = IncomeScheduleDirection.Inflow;

            if (string.IsNullOrWhiteSpace(raw))
                return true;

            var value = raw.Trim();
            if (Enum.TryParse<IncomeScheduleDirection>(value, ignoreCase: true, out var parsed))
            {
                direction = parsed;
                return true;
            }

            if (int.TryParse(value, out var numeric) && Enum.IsDefined(typeof(IncomeScheduleDirection), numeric))
            {
                direction = (IncomeScheduleDirection)numeric;
                return true;
            }

            var normalized = value
                .Replace("-", string.Empty, StringComparison.Ordinal)
                .Replace("_", string.Empty, StringComparison.Ordinal)
                .Replace(" ", string.Empty, StringComparison.Ordinal)
                .ToLowerInvariant();

            direction = normalized switch
            {
                "inflow" or "income" => IncomeScheduleDirection.Inflow,
                "outflow" or "expense" => IncomeScheduleDirection.Outflow,
                _ => default
            };

            return normalized is "inflow" or "income" or "outflow" or "expense";
        }
    }

    public record CreateIncomeScheduleRequest(
        string Label,
        decimal Amount,
        string? Direction,
        string Kind,
        string? RecurrenceInterval,
        DateTime NextExpectedDate,
        DateTime? EndDate,
        string? Notes);

    public record UpdateIncomeScheduleRequest(
        string Label,
        decimal Amount,
        string? Direction,
        string Kind,
        string? RecurrenceInterval,
        DateTime NextExpectedDate,
        DateTime? EndDate,
        string? Notes);
}
