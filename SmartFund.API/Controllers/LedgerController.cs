using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.Ledger;
using SmartFund.Application.Interfaces;
using SmartFund.Application.UseCases.Ledger;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.ValueObjects;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/ledger")]
    public sealed class LedgerController : ControllerBase
    {
        private readonly ILedgerTransactionRepository _repo;
        private readonly PostLedgerTransaction _postUseCase;

        public LedgerController(
            ILedgerTransactionRepository repo,
            ILedgerSequenceGenerator sequenceGenerator)
        {
            _repo = repo;
            _postUseCase = new PostLedgerTransaction(repo, sequenceGenerator);
        }

        [HttpPost("transactions")]
        public async Task<IActionResult> CreateDraft([FromBody] CreateLedgerTransactionRequest request, CancellationToken ct)
        {
            try
            {
                if (request.Entries is null || request.Entries.Count < 2)
                    return BadRequest("At least 2 entries are required.");

                var tx = LedgerTransaction.CreateDraft(request.Narration);

                foreach (var e in request.Entries)
                {
                    // XOR validation at API edge for better error messages
                    var debitPositive = e.Debit > 0;
                    var creditPositive = e.Credit > 0;

                    if (debitPositive == creditPositive)
                        return BadRequest("Each entry must have exactly one of Debit or Credit greater than zero.");

                    if (debitPositive)
                        tx.AddDebit(e.AccountId, Money.NGN(e.Debit));
                    else
                        tx.AddCredit(e.AccountId, Money.NGN(e.Credit));
                }

                await _repo.AddAsync(tx, ct);
                await _repo.SaveChangesAsync(ct);

                return Ok(new
                {
                    tx.Id,
                    tx.Status,
                    tx.Narration,
                    EntryCount = tx.Entries.Count
                });
            }
            catch (DomainException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet("transactions")]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            var txs = await _repo.ListAsync(ct);
            return Ok(txs.Select(tx => new
            {
                tx.Id,
                tx.Status,
                tx.Narration,
                tx.SequenceNumber,
                tx.PostedAtUtc
            }));
        }

        [HttpGet("transactions/{id:long}")]
        public async Task<IActionResult> Get(long id, CancellationToken ct)
        {
            var tx = await _repo.GetAsync(id, ct);
            if (tx is null) return NotFound();

            return Ok(new
            {
                tx.Id,
                tx.Status,
                tx.Narration,
                tx.SequenceNumber,
                tx.PostedAtUtc,
                tx.PostedByUserId,
                Entries = tx.Entries.Select(e => new
                {
                    e.AccountId,
                    Debit = e.Debit.Amount,
                    Credit = e.Credit.Amount
                })
            });
        }

        [HttpPost("transactions/{id:long}/post")]
        public async Task<IActionResult> Post(long id, [FromBody] PostLedgerTransactionRequest request, CancellationToken ct)
        {
            try
            {
                var seq = await _postUseCase.ExecuteAsync(
                    transactionId: id,
                    postedByUserId: request.PostedByUserId,
                    utcNow: DateTime.UtcNow,
                    ct: ct);

                var tx = await _repo.GetAsync(id, ct);

                return Ok(new
                {
                    TransactionId = id,
                    SequenceNumber = seq,
                    Status = tx?.Status,
                    PostedAtUtc = tx?.PostedAtUtc
                });
            }
            catch (DomainException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}