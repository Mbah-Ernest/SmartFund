using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.PersonalFinance;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services;
using SmartFund.Domain.PersonalFinance.Entities;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-goals")]
    public sealed class PersonalGoalController : SmartFundControllerBase
    {
        private readonly IPersonalGoalRepository _goals;
        private readonly UserAuthService _auth;

        public PersonalGoalController(IPersonalGoalRepository goals, UserAuthService auth)
        {
            _goals = goals;
            _auth = auth;
        }

        [HttpPost]
        public async Task<ActionResult<PersonalGoalDto>> Create(
            [FromBody] CreatePersonalGoalRequest request,
            CancellationToken ct)
        {
            var goal = PersonalGoal.Create(GetCurrentUserId(), request.Name, request.TargetAmount, request.Deadline);

            await _goals.AddAsync(goal, ct);
            await _goals.SaveChangesAsync(ct);

            var dto = MapToDto(goal);
            return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
        }

        [HttpGet]
        public async Task<ActionResult<PersonalGoalDto[]>> List(CancellationToken ct)
        {
            var goals = await _goals.ListByUserAsync(GetCurrentUserId(), ct);
            return Ok(goals.Select(MapToDto).ToArray());
        }

        [HttpGet("{id:long}")]
        public async Task<ActionResult<PersonalGoalDto>> GetById(long id, CancellationToken ct)
        {
            var goal = await _goals.GetByIdForUserAsync(id, GetCurrentUserId(), ct);

            if (goal is null)
                return NotFound();

            return Ok(MapToDto(goal));
        }

        [HttpDelete("{id:long}")]
        public async Task<IActionResult> Delete(long id, [FromBody] DeleteGoalRequest body, CancellationToken ct)
        {
            if (body is null || string.IsNullOrWhiteSpace(body.Pin))
                return BadRequest(new { error = "PIN is required." });

            var userId = GetCurrentUserId();
            if (!await _auth.VerifyPasswordAsync(userId, body.Pin, ct))
                return Unauthorized(new { error = "Invalid PIN." });

            var goal = await _goals.GetByIdForUserAsync(id, userId, ct);
            if (goal is null)
                return NotFound();

            await _goals.RemoveAsync(goal, ct);
            await _goals.SaveChangesAsync(ct);
            return NoContent();
        }

        [HttpPost("{id:long}/contribute")]
        public async Task<ActionResult<PersonalGoalDto>> Contribute(
            long id,
            [FromBody] ContributeToGoalRequest request,
            CancellationToken ct)
        {
            var goal = await _goals.GetByIdForUserAsync(id, GetCurrentUserId(), ct);

            if (goal is null)
                return NotFound();

            goal.Contribute(request.Amount);
            await _goals.SaveChangesAsync(ct);

            return Ok(MapToDto(goal));
        }

        private static PersonalGoalDto MapToDto(PersonalGoal g) => new()
        {
            Id = g.Id,
            Name = g.Name,
            TargetAmount = g.TargetAmount,
            SavedAmount = g.SavedAmount,
            Deadline = g.Deadline,
            CreatedAt = g.CreatedAt
        };
    }

    public record DeleteGoalRequest(string Pin);
}
