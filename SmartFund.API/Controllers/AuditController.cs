using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.Audit;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Enums;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/audit")]
    public sealed class AuditController : ControllerBase
    {
        private readonly IAuditService _service;

        public AuditController(IAuditService service) => _service = service;

        [HttpGet("investment")]
        public async Task<IActionResult> ListInvestment(CancellationToken ct)
        {
            var entries = await _service.ListAsync(AuditCategory.InvestmentManagement, ct);
            return Ok(entries.Select(MapDto));
        }

        [HttpGet("personal")]
        public async Task<IActionResult> ListPersonal(CancellationToken ct)
        {
            var entries = await _service.ListAsync(AuditCategory.PersonalFinance, ct);
            return Ok(entries.Select(MapDto));
        }

        [HttpPost("{id}/reverse")]
        public async Task<IActionResult> Reverse(long id, [FromBody] ReverseAuditEntryRequest request, CancellationToken ct)
        {
            var reversalId = await _service.ReverseAsync(id, request.Pin, ct);
            return Ok(new { reversalAuditEntryId = reversalId });
        }

        private static AuditEntryDto MapDto(SmartFund.Domain.Entities.AuditEntry e) => new()
        {
            Id = e.Id,
            Category = (int)e.Category,
            Action = e.Action,
            Description = e.Description,
            LedgerTransactionId = e.LedgerTransactionId,
            ReversesAuditEntryId = e.ReversesAuditEntryId,
            ReversedByAuditEntryId = e.ReversedByAuditEntryId,
            CreatedAtUtc = e.CreatedAtUtc.ToString("O")
        };
    }
}
