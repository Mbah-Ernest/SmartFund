using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/ledger/accounts")]
    public sealed class LedgerAccountsController : ControllerBase
    {
        private readonly ILedgerAccountRepository _repo;

        public LedgerAccountsController(ILedgerAccountRepository repo) => _repo = repo;

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateLedgerAccountRequest request, CancellationToken ct)
        {
            try
            {
                var account = LedgerAccount.Create(
                    request.Name,
                    request.Type,
                    request.ReferenceType,
                    request.ReferenceId);

                await _repo.AddAsync(account, ct);
                await _repo.SaveChangesAsync(ct);

                return Ok(new { account.Id, account.Name, account.Type, account.ReferenceType, account.ReferenceId });
            }
            catch (DomainException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            var accounts = await _repo.ListAsync(ct);
            return Ok(accounts.Select(a => new
            {
                a.Id,
                a.Name,
                a.Type,
                a.Currency,
                a.ReferenceType,
                a.ReferenceId
            }));
        }

        public sealed class CreateLedgerAccountRequest
        {
            public string Name { get; set; } = default!;
            public AccountType Type { get; set; }
            public ReferenceType ReferenceType { get; set; } = ReferenceType.None;
            public long? ReferenceId { get; set; }
        }
    }
}