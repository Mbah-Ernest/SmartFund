using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Application.UseCases.Loans;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;

namespace SmartFund.API.Controllers;

[ApiController]
[Authorize(Roles = "Admin")]
[Route("api/admin")]
public sealed class AdminController : SmartFundControllerBase
{
    private readonly ILoanApplicationRepository _loanRepo;
    private readonly IUserRepository _userRepo;
    private readonly ReviewLoanApplication _review;
    private readonly DisburseLoanApplication _disburse;
    private readonly IUserCreditInsightsService _insights;

    public AdminController(
        ILoanApplicationRepository loanRepo,
        IUserRepository userRepo,
        ReviewLoanApplication review,
        DisburseLoanApplication disburse,
        IUserCreditInsightsService insights)
    {
        _loanRepo = loanRepo;
        _userRepo = userRepo;
        _review = review;
        _disburse = disburse;
        _insights = insights;
    }

    // ── Loan management ───────────────────────────────────────────────────────

    [HttpGet("loans")]
    public async Task<IActionResult> ListLoans(
        [FromQuery] string? status,
        [FromQuery] long? userId,
        CancellationToken ct)
    {
        LoanApplicationStatus? statusFilter = null;
        if (!string.IsNullOrWhiteSpace(status) &&
            System.Enum.TryParse<LoanApplicationStatus>(status, ignoreCase: true, out var s))
            statusFilter = s;

        var loans = userId.HasValue
            ? await _loanRepo.ListByUserAsync(userId.Value, ct)
            : await _loanRepo.ListAllAsync(statusFilter, ct);

        return Ok(loans.Select(MapLoanDto));
    }

    [HttpPut("loans/{id:long}/start-review")]
    public async Task<IActionResult> StartReview(long id, CancellationToken ct)
    {
        await _review.StartReviewAsync(id, ct);
        return NoContent();
    }

    [HttpPut("loans/{id:long}/review")]
    public async Task<IActionResult> Review(long id, [FromBody] ReviewRequest body, CancellationToken ct)
    {
        if (!string.Equals(body.Action, "approve", System.StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(body.Action, "reject", System.StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Action must be 'approve' or 'reject'." });

        if (string.Equals(body.Action, "approve", System.StringComparison.OrdinalIgnoreCase))
            await _review.ApproveAsync(id, GetCurrentUserId(), body.Note, ct);
        else
            await _review.RejectAsync(id, GetCurrentUserId(), body.Note, ct);

        return NoContent();
    }

    [HttpPut("loans/{id:long}/disburse")]
    public async Task<IActionResult> Disburse(long id, CancellationToken ct)
    {
        await _disburse.ExecuteAsync(id, ct);
        return NoContent();
    }

    // ── User management ───────────────────────────────────────────────────────

    [HttpGet("users")]
    public async Task<IActionResult> ListUsers(CancellationToken ct)
    {
        var users = await _userRepo.ListAsync(ct);
        return Ok(users.Select(u => new
        {
            u.Id,
            u.Email,
            u.FullName,
            Role = u.Role.ToString(),
            u.IsActive,
            u.CreatedAtUtc
        }));
    }

    [HttpGet("users/{id:long}/insights")]
    public async Task<IActionResult> GetInsights(long id, CancellationToken ct)
    {
        var insights = await _insights.GetInsightsAsync(id, ct);
        return Ok(insights);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private static object MapLoanDto(LoanApplication a) => new
    {
        a.Id,
        a.UserId,
        a.Amount,
        PurposeCategory = a.PurposeCategory.ToString(),
        a.PurposeDescription,
        a.DurationDays,
        a.RepaymentInstallments,
        a.AccountNumber,
        a.BankName,
        a.AccountName,
        a.DailyInterestRate,
        a.InterestAmount,
        a.TotalRepayable,
        a.InstallmentAmount,
        Status = a.Status.ToString(),
        a.SubmittedAtUtc,
        a.ReviewedAtUtc,
        a.ReviewedByUserId,
        a.AdminNote
    };
}

public record ReviewRequest(string Action, string? Note);
