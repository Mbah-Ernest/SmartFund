using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Infrastructure;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services.PersonalFinance;
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.API.Controllers;

[ApiController]
[Authorize]
[Route("api/bank")]
public sealed class BankInboxController : SmartFundControllerBase
{
    private readonly BankInboxService _inbox;
    private readonly TransferDetectionService _transferDetection;
    private readonly IBankImportedTransactionRepository _importRepo;

    public BankInboxController(
        BankInboxService inbox,
        TransferDetectionService transferDetection,
        IBankImportedTransactionRepository importRepo)
    {
        _inbox = inbox;
        _transferDetection = transferDetection;
        _importRepo = importRepo;
    }

    /// <summary>Paginated list of transactions needing review.</summary>
    [HttpGet("inbox")]
    public async Task<IActionResult> GetInbox(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        [FromQuery] long? accountId = null,
        CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 50;

        var userId = GetCurrentUserId();
        var items = await _importRepo.ListInboxAsync(page, pageSize, userId, accountId, ct);
        var count = await _importRepo.CountNeedsReviewAsync(userId, ct);

        return Ok(new
        {
            page,
            pageSize,
            totalCount = count,
            items = items.Select(i => new
            {
                i.Id,
                i.ConnectedBankAccountId,
                i.MonoTransactionId,
                AmountNaira = i.AmountKobo / 100m,
                i.Direction,
                i.RawNarration,
                i.NormalizedNarration,
                i.ExtractedMerchant,
                i.TransactionDateUtc,
                i.ImportedAtUtc,
                Status = i.Status.ToString(),
                i.IsPending,
                i.IsReversal,
                i.TransferPairImportId
            })
        });
    }

    /// <summary>Badge count of items needing review.</summary>
    [HttpGet("inbox/count")]
    public async Task<IActionResult> GetInboxCount(CancellationToken ct)
    {
        var count = await _importRepo.CountNeedsReviewAsync(GetCurrentUserId(), ct);
        return Ok(new { count });
    }

    /// <summary>Posts a single inbox item to the ledger after user categorization.</summary>
    [HttpPost("inbox/{id:long}/categorize")]
    public async Task<IActionResult> Categorize(long id, [FromBody] CategorizeRequest body, CancellationToken ct)
    {
        if (!System.Enum.TryParse<PersonalTransactionType>(body.TransactionType, ignoreCase: true, out var txType))
            return BadRequest(new { error = "Invalid transactionType. Use 'Income' or 'Expense'." });

        var ledgerTxId = await _inbox.CategorizeAsync(
            GetCurrentUserId(),
            id,
            body.WalletId,
            body.CategoryId,
            txType,
            body.Description,
            body.CreateRule,
            body.RuleMatchText,
            ct);

        return Ok(new { ledgerTransactionId = ledgerTxId });
    }

    /// <summary>Excludes an inbox item (not posted to ledger).</summary>
    [HttpPost("inbox/{id:long}/exclude")]
    public async Task<IActionResult> Exclude(long id, [FromBody] ExcludeRequest body, CancellationToken ct)
    {
        await _inbox.ExcludeAsync(GetCurrentUserId(), id, body.Note, ct);
        return NoContent();
    }

    /// <summary>Applies the same category to multiple inbox items at once.</summary>
    [HttpPost("inbox/bulk-categorize")]
    public async Task<IActionResult> BulkCategorize([FromBody] BulkCategorizeRequest body, CancellationToken ct)
    {
        if (!System.Enum.TryParse<PersonalTransactionType>(body.TransactionType, ignoreCase: true, out var txType))
            return BadRequest(new { error = "Invalid transactionType. Use 'Income' or 'Expense'." });

        var posted = await _inbox.BulkCategorizeAsync(
            GetCurrentUserId(), body.ImportIds, body.WalletId, body.CategoryId, txType, ct);
        return Ok(new { posted });
    }

    /// <summary>Manually pairs two inbox imports as an inter-account transfer.</summary>
    [HttpPost("inbox/pair")]
    public async Task<IActionResult> PairTransfer([FromBody] PairTransferRequest body, CancellationToken ct)
    {
        await _transferDetection.ManuallyPairAsync(body.ImportIdA, body.ImportIdB, ct);
        return NoContent();
    }

    /// <summary>Removes a transfer pairing, returning both sides to NeedsReview.</summary>
    [HttpPost("inbox/{id:long}/unpair")]
    public async Task<IActionResult> UnpairTransfer(long id, CancellationToken ct)
    {
        await _transferDetection.UnpairAsync(id, ct);
        return NoContent();
    }
}

public record CategorizeRequest(
    long WalletId,
    long CategoryId,
    string TransactionType,
    string? Description,
    bool CreateRule,
    string? RuleMatchText);

public record ExcludeRequest(string? Note);

public record BulkCategorizeRequest(
    List<long> ImportIds,
    long WalletId,
    long CategoryId,
    string TransactionType);

public record PairTransferRequest(long ImportIdA, long ImportIdB);
