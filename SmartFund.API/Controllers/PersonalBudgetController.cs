using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.PersonalBudget;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalBudget.Entities;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-budgets")]
    public sealed class PersonalBudgetController : ControllerBase
    {
        private readonly IPersonalBudgetRepository _budgets;
        private readonly IPersonalBudgetTrackingRepository _tracking;

        public PersonalBudgetController(
            IPersonalBudgetRepository budgets,
            IPersonalBudgetTrackingRepository tracking)
        {
            _budgets = budgets;
            _tracking = tracking;
        }

        [HttpPost]
        public async Task<ActionResult<BudgetDto>> Create(
            [FromBody] CreatePersonalBudgetRequest request,
            CancellationToken ct)
        {
            var budget = Budget.Create(request.CategoryId, request.Amount, request.Period);

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
            var budgets = await _budgets.ListAsync(ct);

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
            var budget = await _budgets.GetByIdAsync(id, ct);

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
            var budget = await _budgets.GetByIdAsync(id, ct);

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
    }
}
