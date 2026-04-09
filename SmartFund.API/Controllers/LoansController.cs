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
[Authorize]
[Route("api/loans")]
public sealed class LoansController : SmartFundControllerBase
{
    private readonly SubmitLoanApplicantProfile _submitProfile;
    private readonly ReviewLoanApplicantProfile _reviewProfile;
    private readonly SubmitLoanApplication _submit;
    private readonly ReviewLoanApplication _reviewLoan;
    private readonly DisburseLoanApplication _disburseLoan;
    private readonly ILoanApplicantProfileRepository _profileRepo;
    private readonly ILoanApplicationRepository _repo;

    public LoansController(
        SubmitLoanApplicantProfile submitProfile,
        ReviewLoanApplicantProfile reviewProfile,
        SubmitLoanApplication submit,
        ReviewLoanApplication reviewLoan,
        DisburseLoanApplication disburseLoan,
        ILoanApplicantProfileRepository profileRepo,
        ILoanApplicationRepository repo)
    {
        _submitProfile = submitProfile;
        _reviewProfile = reviewProfile;
        _submit = submit;
        _reviewLoan = reviewLoan;
        _disburseLoan = disburseLoan;
        _profileRepo = profileRepo;
        _repo = repo;
    }

    [HttpPost("applicants")]
    public async Task<IActionResult> SubmitApplicant([FromBody] SubmitLoanApplicantRequest body, CancellationToken ct)
    {
        var profile = await _submitProfile.ExecuteAsync(GetCurrentUserId(), body.FullName ?? string.Empty, ct);
        return StatusCode(201, MapApplicantDto(profile));
    }

    [HttpGet("applicants/me")]
    public async Task<IActionResult> MyApplicantProfile(CancellationToken ct)
    {
        var profile = await _profileRepo.GetByUserIdAsync(GetCurrentUserId(), ct);
        return Ok(profile is null ? null : MapApplicantDto(profile));
    }

    [HttpGet("applicants")]
    public async Task<IActionResult> ListApplicants([FromQuery] LoanApplicantStatus? status, CancellationToken ct)
    {
        var profiles = await _profileRepo.ListAllAsync(status, ct);
        return Ok(profiles.Select(MapApplicantDto));
    }

    [HttpPost("applicants/{id:long}/verify")]
    public async Task<IActionResult> VerifyApplicant(long id, [FromBody] VerifyLoanApplicantRequest body, CancellationToken ct)
    {
        await _reviewProfile.VerifyAsync(
            id,
            GetCurrentUserId(),
            body.FullName ?? string.Empty,
            body.PhoneNumber ?? string.Empty,
            body.EmailAddress ?? string.Empty,
            body.EmergencyContactNumber ?? string.Empty,
            body.AdminNote,
            ct);

        return Ok(new { ok = true });
    }

    [HttpPost("applicants/{id:long}/reject")]
    public async Task<IActionResult> RejectApplicant(long id, [FromBody] RejectLoanApplicantRequest body, CancellationToken ct)
    {
        await _reviewProfile.RejectAsync(id, GetCurrentUserId(), body.AdminNote, ct);
        return Ok(new { ok = true });
    }

    [HttpPost]
    public async Task<IActionResult> Submit([FromBody] SubmitLoanRequest body, CancellationToken ct)
    {
        var purpose = LoanPurpose.Other;
        if (!string.IsNullOrWhiteSpace(body.PurposeCategory)
            && !System.Enum.TryParse(body.PurposeCategory, ignoreCase: true, out purpose))
            return BadRequest(new { error = "Invalid purposeCategory." });

        var application = await _submit.ExecuteAsync(
            GetCurrentUserId(),
            body.Amount,
            purpose,
            body.PurposeDescription ?? string.Empty,
            body.DurationDays,
            body.RepaymentInstallments,
            body.AccountNumber ?? string.Empty,
            body.BankName ?? string.Empty,
            body.AccountName ?? string.Empty,
            ct);

        return StatusCode(201, MapDto(application));
    }

    [HttpGet]
    public async Task<IActionResult> ListAll([FromQuery] LoanApplicationStatus? status, CancellationToken ct)
    {
        var loans = await _repo.ListAllAsync(status, ct);
        return Ok(loans.Select(MapDto));
    }

    [HttpPost("{id:long}/review")]
    public async Task<IActionResult> StartReview(long id, CancellationToken ct)
    {
        await _reviewLoan.StartReviewAsync(id, ct);
        return Ok(new { ok = true });
    }

    [HttpPost("{id:long}/approve")]
    public async Task<IActionResult> Approve(long id, [FromBody] ReviewLoanRequest body, CancellationToken ct)
    {
        await _reviewLoan.ApproveAsync(id, GetCurrentUserId(), body.AdminNote, ct);
        return Ok(new { ok = true });
    }

    [HttpPost("{id:long}/reject")]
    public async Task<IActionResult> Reject(long id, [FromBody] ReviewLoanRequest body, CancellationToken ct)
    {
        await _reviewLoan.RejectAsync(id, GetCurrentUserId(), body.AdminNote, ct);
        return Ok(new { ok = true });
    }

    [HttpPost("{id:long}/disburse")]
    public async Task<IActionResult> Disburse(long id, CancellationToken ct)
    {
        await _disburseLoan.ExecuteAsync(id, ct);
        return Ok(new { ok = true });
    }

    [HttpGet("my")]
    public async Task<IActionResult> MyLoans(CancellationToken ct)
    {
        var loans = await _repo.ListByUserAsync(GetCurrentUserId(), ct);
        return Ok(loans.Select(MapDto));
    }

    private static object MapDto(LoanApplication a) => new
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
        a.AdminNote
    };

    private static object MapApplicantDto(LoanApplicantProfile profile) => new
    {
        profile.Id,
        profile.UserId,
        profile.SubmittedName,
        profile.FullName,
        profile.PhoneNumber,
        profile.EmailAddress,
        profile.EmergencyContactNumber,
        Status = profile.Status.ToString(),
        profile.SubmittedAtUtc,
        profile.ReviewedAtUtc,
        profile.AdminNote
    };
}

public record SubmitLoanRequest(
    decimal Amount,
    int DurationDays,
    int RepaymentInstallments,
    string? AccountNumber,
    string? BankName,
    string? AccountName,
    string? PurposeCategory,
    string? PurposeDescription);

public record SubmitLoanApplicantRequest(string? FullName);

public record VerifyLoanApplicantRequest(
    string? FullName,
    string? PhoneNumber,
    string? EmailAddress,
    string? EmergencyContactNumber,
    string? AdminNote);

public record RejectLoanApplicantRequest(string? AdminNote);

public record ReviewLoanRequest(string? AdminNote);
