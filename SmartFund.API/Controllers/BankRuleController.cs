using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.PersonalFinance.Entities;
using SmartFund.Domain.PersonalFinance.Enums;
using SmartFund.Application.Services.PersonalFinance;

namespace SmartFund.API.Controllers;

[ApiController]
[Authorize]
[Route("api/bank/rules")]
public sealed class BankRuleController : SmartFundControllerBase
{
    private readonly IBankCategorizationRuleRepository _ruleRepo;
    private readonly CategorizationEngine _engine;

    public BankRuleController(IBankCategorizationRuleRepository ruleRepo, CategorizationEngine engine)
    {
        _ruleRepo = ruleRepo;
        _engine = engine;
    }

    /// <summary>Lists all rules sorted by priority.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        var rules = await _ruleRepo.ListAllByUserAsync(GetCurrentUserId(), ct);
        return Ok(rules.Select(r => new
        {
            r.Id,
            r.MatchText,
            r.IsRegex,
            r.CaseSensitive,
            r.CategoryId,
            TransactionType = r.TransactionType.ToString(),
            r.Priority,
            r.IsActive,
            r.Description,
            r.AutoPostCredits,
            r.CreatedAtUtc,
            r.LastMatchedAtUtc,
            r.MatchCount
        }));
    }

    /// <summary>Creates a new categorization rule.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRuleRequest body, CancellationToken ct)
    {
        if (!Enum.TryParse<PersonalTransactionType>(body.TransactionType, ignoreCase: true, out var txType))
            return BadRequest(new { error = "Invalid transactionType." });

        var rule = BankCategorizationRule.Create(
            GetCurrentUserId(),
            body.MatchText,
            body.IsRegex,
            body.CaseSensitive,
            body.CategoryId,
            txType,
            body.Priority,
            body.Description,
            body.AutoPostCredits,
            DateTime.UtcNow);

        await _ruleRepo.AddAsync(rule, ct);
        await _ruleRepo.SaveChangesAsync(ct);

        return Ok(new { rule.Id, rule.MatchText, rule.Priority });
    }

    /// <summary>Updates an existing rule.</summary>
    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] UpdateRuleRequest body, CancellationToken ct)
    {
        var rule = await _ruleRepo.GetByIdForUserAsync(id, GetCurrentUserId(), ct);
        if (rule is null) return NotFound();

        if (!Enum.TryParse<PersonalTransactionType>(body.TransactionType, ignoreCase: true, out var txType))
            return BadRequest(new { error = "Invalid transactionType." });

        rule.Update(body.MatchText, body.IsRegex, body.CaseSensitive, body.CategoryId,
            txType, body.Description, body.AutoPostCredits);

        if (body.Priority.HasValue)
            rule.UpdatePriority(body.Priority.Value);

        await _ruleRepo.SaveChangesAsync(ct);
        return Ok(new { rule.Id });
    }

    /// <summary>Deactivates a rule (soft delete).</summary>
    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Deactivate(long id, CancellationToken ct)
    {
        var rule = await _ruleRepo.GetByIdForUserAsync(id, GetCurrentUserId(), ct);
        if (rule is null) return NotFound();

        rule.Deactivate();
        await _ruleRepo.SaveChangesAsync(ct);
        return NoContent();
    }

    /// <summary>Tests a narration string against a pattern (dev helper).</summary>
    [HttpPost("test")]
    public IActionResult Test([FromBody] TestRuleRequest body)
    {
        var normalized = _engine.Normalize(body.Narration);
        var merchant = _engine.ExtractMerchant(normalized);

        bool matched;
        try
        {
            if (body.IsRegex)
                matched = System.Text.RegularExpressions.Regex.IsMatch(normalized, body.Pattern,
                    body.CaseSensitive
                        ? System.Text.RegularExpressions.RegexOptions.None
                        : System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            else
                matched = normalized.Contains(body.Pattern,
                    body.CaseSensitive ? StringComparison.Ordinal : StringComparison.OrdinalIgnoreCase);
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = $"Invalid pattern: {ex.Message}" });
        }

        return Ok(new { normalized, merchant, matched });
    }
}

public record CreateRuleRequest(
    string MatchText,
    bool IsRegex,
    bool CaseSensitive,
    long CategoryId,
    string TransactionType,
    int Priority,
    string? Description,
    bool AutoPostCredits);

public record UpdateRuleRequest(
    string MatchText,
    bool IsRegex,
    bool CaseSensitive,
    long CategoryId,
    string TransactionType,
    int? Priority,
    string? Description,
    bool AutoPostCredits);

public record TestRuleRequest(string Narration, string Pattern, bool IsRegex, bool CaseSensitive);
