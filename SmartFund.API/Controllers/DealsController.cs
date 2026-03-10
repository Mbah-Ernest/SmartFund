using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.Application.UseCases.Deals;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/deals")]
    public sealed class DealsController : ControllerBase
    {
        private readonly CreateDeal _create;
        private readonly ListDeals _list;
        private readonly GetDeal _get;

        public DealsController(CreateDeal create, ListDeals list, GetDeal get)
        {
            _create = create;
            _list = list;
            _get = get;
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateDealRequest request, CancellationToken ct)
        {
            var id = await _create.ExecuteAsync(
                request.DealCode,
                request.Title,
                request.BorrowerName,
                request.LoanAmount,
                request.InterestRate,
                request.TenureMonths,
                DateTime.UtcNow,
                ct);

            return Ok(new { dealId = id });
        }

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            var deals = await _list.ExecuteAsync(ct);
            return Ok(deals.Select(d => new
            {
                d.Id,
                d.DealCode,
                d.Title,
                d.BorrowerName,
                d.LoanAmount,
                d.InterestRate,
                d.TenureMonths,
                d.Status,
                d.CreatedAtUtc
            }));
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> Get(long id, CancellationToken ct)
        {
            var deal = await _get.ExecuteAsync(id, ct);
            if (deal is null) return NotFound();

            return Ok(new
            {
                deal.Id,
                deal.DealCode,
                deal.Title,
                deal.BorrowerName,
                deal.LoanAmount,
                deal.InterestRate,
                deal.TenureMonths,
                deal.Status,
                deal.CreatedAtUtc
            });
        }

        public sealed class CreateDealRequest
        {
            public string DealCode { get; set; } = default!;
            public string Title { get; set; } = default!;
            public string BorrowerName { get; set; } = default!;
            public decimal LoanAmount { get; set; }
            public decimal InterestRate { get; set; }
            public int TenureMonths { get; set; }
        }
    }
}
