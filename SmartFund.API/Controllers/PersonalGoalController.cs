using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.PersonalFinance;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-goals")]
    public sealed class PersonalGoalController : ControllerBase
    {
        private readonly IPersonalGoalRepository _goals;

        public PersonalGoalController(IPersonalGoalRepository goals) => _goals = goals;

        [HttpPost]
        public async Task<ActionResult<PersonalGoalDto>> Create(
            [FromBody] CreatePersonalGoalRequest request,
            CancellationToken ct)
        {
            var goal = PersonalGoal.Create(request.Name, request.TargetAmount, request.Deadline);

            await _goals.AddAsync(goal, ct);
            await _goals.SaveChangesAsync(ct);

            var dto = MapToDto(goal);
            return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
        }

        [HttpGet]
        public async Task<ActionResult<PersonalGoalDto[]>> List(CancellationToken ct)
        {
            var goals = await _goals.ListAsync(ct);
            return Ok(goals.Select(MapToDto).ToArray());
        }

        [HttpGet("{id:long}")]
        public async Task<ActionResult<PersonalGoalDto>> GetById(long id, CancellationToken ct)
        {
            var goal = await _goals.GetByIdAsync(id, ct);

            if (goal is null)
                return NotFound();

            return Ok(MapToDto(goal));
        }

        [HttpPost("{id:long}/contribute")]
        public async Task<ActionResult<PersonalGoalDto>> Contribute(
            long id,
            [FromBody] ContributeToGoalRequest request,
            CancellationToken ct)
        {
            var goal = await _goals.GetByIdAsync(id, ct);

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
}
