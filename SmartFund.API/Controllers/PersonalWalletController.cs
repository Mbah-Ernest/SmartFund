using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.PersonalFinance;
using SmartFund.Application.Interfaces;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-wallets")]
    public sealed class PersonalWalletController : ControllerBase
    {
        private readonly IPersonalWalletService _wallets;

        public PersonalWalletController(IPersonalWalletService wallets) => _wallets = wallets;

        [HttpPost]
        public async Task<ActionResult<PersonalWalletDto>> Create(
            [FromBody] CreatePersonalWalletRequest request,
            CancellationToken ct)
        {
            var wallet = await _wallets.CreateWalletAsync(request.Name, request.Currency, ct);

            var dto = new PersonalWalletDto
            {
                Id = wallet.Id,
                Name = wallet.Name,
                Currency = wallet.Currency,
                LedgerAccountId = wallet.LedgerAccountId,
                CreatedAt = wallet.CreatedAt
            };

            return CreatedAtAction(nameof(GetById), new { id = dto.Id }, dto);
        }

        [HttpGet("{id:long}")]
        public async Task<ActionResult<PersonalWalletDto>> GetById(long id, CancellationToken ct)
        {
            var wallet = await _wallets.GetWalletAsync(id, ct);

            if (wallet is null)
                return NotFound();

            return Ok(new PersonalWalletDto
            {
                Id = wallet.Id,
                Name = wallet.Name,
                Currency = wallet.Currency,
                LedgerAccountId = wallet.LedgerAccountId,
                CreatedAt = wallet.CreatedAt
            });
        }

        [HttpGet]
        public async Task<ActionResult<PersonalWalletDto[]>> List(CancellationToken ct)
        {
            var wallets = await _wallets.GetAllWalletsAsync(ct);

            var dtos = wallets.Select(w => new PersonalWalletDto
            {
                Id = w.Id,
                Name = w.Name,
                Currency = w.Currency,
                LedgerAccountId = w.LedgerAccountId,
                CreatedAt = w.CreatedAt
            }).ToArray();

            return Ok(dtos);
        }

        [HttpGet("{id:long}/balance")]
        public async Task<ActionResult<WalletBalanceDto>> GetBalance(long id, CancellationToken ct)
        {
            var balance = await _wallets.GetWalletBalanceAsync(id, ct);
            return Ok(new WalletBalanceDto { WalletId = id, Balance = balance });
        }
    }
}
