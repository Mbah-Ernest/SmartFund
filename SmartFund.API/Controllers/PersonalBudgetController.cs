using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.PersonalBudget;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Enums;
using SmartFund.Domain.PersonalBudget.Entities;
using SmartFund.Domain.PersonalBudget.Enums;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-budgets")]
    public sealed class PersonalBudgetController : SmartFundControllerBase
    {
        private readonly IPersonalBudgetRepository _budgets;
        private readonly IPersonalBudgetTrackingRepository _tracking;
        private readonly IAuditService _auditService;

        public PersonalBudgetController(
            IPersonalBudgetRepository budgets,
            IPersonalBudgetTrackingRepository tracking,
            IAuditService auditService)
        {
            _budgets = budgets;
            _tracking = tracking;
            _auditService = auditService;
        }

        [HttpPost]
        public async Task<ActionResult<BudgetDto>> Create(
            [FromBody] CreatePersonalBudgetRequest request,
            CancellationToken ct)
        {
            var budget = Budget.Create(GetCurrentUserId(), request.CategoryId, request.Amount, request.Period);

            await _budgets.AddAsync(budget, ct);
            await _budgets.SaveChangesAsync(ct);

            var dto = new BudgetDto
            {
                Id = budget.Id,
                CategoryId = budget.CategoryId,
                Amount = budget.Amount,
                Period = budget.Period
            };

            return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
        }

        [HttpGet]
        public async Task<ActionResult<BudgetDto[]>> List(CancellationToken ct)
        {
            var budgets = await _budgets.ListByUserAsync(GetCurrentUserId(), ct);

            return Ok(budgets.Select(b => new BudgetDto
            {
                Id = b.Id,
                CategoryId = b.CategoryId,
                Amount = b.Amount,
                Period = b.Period
            }).ToArray());
        }

        [HttpGet("{id:long}")]
        public async Task<ActionResult<BudgetDto>> GetById(long id, CancellationToken ct)
        {
            var budget = await _budgets.GetByIdForUserAsync(id, GetCurrentUserId(), ct);

            if (budget is null)
                return NotFound();

            return Ok(new BudgetDto
            {
                Id = budget.Id,
                CategoryId = budget.CategoryId,
                Amount = budget.Amount,
                Period = budget.Period
            });
        }

        [HttpGet("{id:long}/tracking")]
        public async Task<ActionResult<BudgetTrackingDto[]>> Tracking(long id, CancellationToken ct)
        {
            var budget = await _budgets.GetByIdForUserAsync(id, GetCurrentUserId(), ct);

            if (budget is null)
                return NotFound();

            var rows = await _tracking.ListByBudgetIdAsync(id, ct);

            return Ok(rows.Select(t => new BudgetTrackingDto
            {
                BudgetId = t.BudgetId,
                Year = t.Year,
                Month = t.Month,
                SpentAmount = t.SpentAmount,
                RemainingAmount = t.RemainingAmount,
                IsOverBudget = t.RemainingAmount < 0m
            }).ToArray());
        }

        [HttpPut("{id:long}")]
        public async Task<IActionResult> Update(long id, [FromBody] UpdatePersonalBudgetRequest request, CancellationToken ct)
        {
            var budget = await _budgets.GetByIdForUserAsync(id, GetCurrentUserId(), ct);
            if (budget is null)
                return NotFound();

            budget.Update(request.CategoryId, request.Amount, (BudgetPeriod)request.Period);
            await _budgets.SaveChangesAsync(ct);

            await _auditService.RecordAsync(AuditCategory.PersonalFinance, "UpdateBudget",
                $"Updated budget #{id}: category {request.CategoryId}, limit ₦{request.Amount:N2}, period {(BudgetPeriod)request.Period}", null, ct);

            return Ok(new { id = budget.Id, categoryId = budget.CategoryId, amount = budget.Amount, period = (int)budget.Period });
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, CancellationToken ct)
        {
            var budget = await _budgets.GetByIdForUserAsync(id, GetCurrentUserId(), ct);
            if (budget is null)
                return NotFound();

            await _budgets.RemoveAsync(budget, ct);
            await _budgets.SaveChangesAsync(ct);

            await _auditService.RecordAsync(AuditCategory.PersonalFinance, "DeleteBudget",
                $"Deleted budget #{id} (category {budget.CategoryId}, limit ₦{budget.Amount:N2})", null, ct);

            return NoContent();
        }
    }
}
