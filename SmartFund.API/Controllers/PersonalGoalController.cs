using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.PersonalFinance;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services;
using SmartFund.Application.UseCases.PersonalFinance;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalFinance.Entities;
using System;
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
        private readonly IPersonalWalletService _walletService;
        private readonly GetGoalInsights _goalInsights;

        public PersonalGoalController(
            IPersonalGoalRepository goals,
            UserAuthService auth,
            IPersonalWalletService walletService,
            GetGoalInsights goalInsights)
        {
            _goals = goals;
            _auth = auth;
            _walletService = walletService;
            _goalInsights = goalInsights;
        }

        [HttpPost]
        public async Task<ActionResult<PersonalGoalDto>> Create(
            [FromBody] CreatePersonalGoalRequest request,
            CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var goal = PersonalGoal.Create(userId, request.Name, request.TargetAmount, request.Deadline);

            if (request.WalletId.HasValue)
            {
                var wallet = await _walletService.GetWalletForUserAsync(request.WalletId.Value, userId, ct);
                if (wallet is null)
                    return BadRequest(new { error = "Wallet not found or does not belong to this user." });
                goal.SetWallet(wallet.Id);
            }

            await _goals.AddAsync(goal, ct);
            await _goals.SaveChangesAsync(ct);

            var dto = await MapToDtoAsync(goal, ct);
            return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
        }

        [HttpGet]
        public async Task<ActionResult<PersonalGoalDto[]>> List(CancellationToken ct)
        {
            var goals = await _goals.ListByUserAsync(GetCurrentUserId(), ct);
            var dtos = new PersonalGoalDto[goals.Count];
            for (var i = 0; i < goals.Count; i++)
                dtos[i] = await MapToDtoAsync(goals[i], ct);
            return Ok(dtos);
        }

        [HttpGet("{id:long}")]
        public async Task<ActionResult<PersonalGoalDto>> GetById(long id, CancellationToken ct)
        {
            var goal = await _goals.GetByIdForUserAsync(id, GetCurrentUserId(), ct);
            if (goal is null)
                return NotFound();
            return Ok(await MapToDtoAsync(goal, ct));
        }

        [HttpGet("insights")]
        public async Task<ActionResult<GoalInsightsDto>> GetInsights(CancellationToken ct)
        {
            var result = await _goalInsights.ExecuteAsync(GetCurrentUserId(), ct);

            return Ok(new GoalInsightsDto
            {
                TotalTargetNaira = result.TotalTargetNaira,
                TotalSavedNaira = result.TotalSavedNaira,
                GoalsOnTrack = result.GoalsOnTrack,
                TotalActiveGoals = result.TotalActiveGoals,
                OverdueGoals = result.OverdueGoals,
                OverallProgressPct = result.OverallProgressPct,
                NextDeadlineGoalId = result.NextDeadlineGoalId,
                NextDeadlineGoalName = result.NextDeadlineGoalName,
                NextDeadline = result.NextDeadline,
                Items = result.Items.Select(i => new GoalInsightItemDto
                {
                    GoalId = i.GoalId,
                    Name = i.Name,
                    TargetNaira = i.TargetNaira,
                    SavedNaira = i.SavedNaira,
                    ProgressPct = i.ProgressPct,
                    MonthlyRequiredNaira = i.MonthlyRequiredNaira,
                    EstimatedCompletionDate = i.EstimatedCompletionDate,
                    IsOnTrack = i.IsOnTrack,
                    IsOverdue = i.IsOverdue,
                    IsWalletLinked = i.IsWalletLinked,
                    WalletId = i.WalletId
                }).ToList()
            });
        }

        [HttpPatch("{id:long}/wallet")]
        public async Task<ActionResult<PersonalGoalDto>> SetWallet(
            long id,
            [FromBody] SetGoalWalletRequest request,
            CancellationToken ct)
        {
            var userId = GetCurrentUserId();
            var goal = await _goals.GetByIdForUserAsync(id, userId, ct);
            if (goal is null)
                return NotFound();

            if (request.WalletId.HasValue)
            {
                var wallet = await _walletService.GetWalletForUserAsync(request.WalletId.Value, userId, ct);
                if (wallet is null)
                    return BadRequest(new { error = "Wallet not found or does not belong to this user." });
                goal.SetWallet(wallet.Id);
            }
            else
            {
                goal.UnlinkWallet();
            }

            await _goals.SaveChangesAsync(ct);
            return Ok(await MapToDtoAsync(goal, ct));
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

            if (goal.WalletId.HasValue)
                return BadRequest(new { error = "This goal tracks savings via a linked wallet. Make a wallet transfer instead." });

            goal.Contribute(request.Amount);
            await _goals.SaveChangesAsync(ct);

            return Ok(await MapToDtoAsync(goal, ct));
        }

        private async Task<PersonalGoalDto> MapToDtoAsync(PersonalGoal g, CancellationToken ct)
        {
            decimal effectiveSaved;
            if (g.WalletId.HasValue)
            {
                try
                {
                    effectiveSaved = await _walletService.GetWalletBalanceAsync(g.WalletId.Value, ct);
                }
                catch
                {
                    effectiveSaved = g.SavedAmount;
                }
            }
            else
            {
                effectiveSaved = g.SavedAmount;
            }

            var progressPct = g.TargetAmount > 0
                ? Math.Min(100m, Math.Round(effectiveSaved / g.TargetAmount * 100m, 2))
                : 0m;

            return new PersonalGoalDto
            {
                Id = g.Id,
                Name = g.Name,
                TargetAmount = g.TargetAmount,
                SavedAmount = g.SavedAmount,
                EffectiveSavedAmount = effectiveSaved,
                ProgressPct = progressPct,
                RemainingAmount = Math.Max(0m, g.TargetAmount - effectiveSaved),
                WalletId = g.WalletId,
                IsWalletLinked = g.WalletId.HasValue,
                Deadline = g.Deadline,
                CreatedAt = g.CreatedAt
            };
        }
    }

    public record DeleteGoalRequest(string Pin);
    public record SetGoalWalletRequest(long? WalletId);
}
