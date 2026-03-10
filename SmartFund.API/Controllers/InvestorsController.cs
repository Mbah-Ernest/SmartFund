using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Exceptions;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/investors")]
    public sealed class InvestorsController : ControllerBase
    {
        private readonly IInvestorRepository _repo;

        public InvestorsController(IInvestorRepository repo) => _repo = repo;

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateInvestorRequest request, CancellationToken ct)
        {
            try
            {
                var investor = Investor.Create(
                    request.FullName,
                    request.Email,
                    request.Phone,
                    DateTime.UtcNow);

                await _repo.AddAsync(investor, ct);
                await _repo.SaveChangesAsync(ct);

                return Ok(new
                {
                    investor.Id,
                    investor.FullName,
                    investor.Email,
                    investor.Phone,
                    investor.Status,
                    investor.CreatedAtUtc
                });
            }
            catch (DomainException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpGet]
        public async Task<IActionResult> List(CancellationToken ct)
        {
            var investors = await _repo.ListAsync(ct);
            return Ok(investors.Select(i => new
            {
                i.Id,
                i.FullName,
                i.Email,
                i.Phone,
                i.Status,
                i.CreatedAtUtc
            }));
        }

        [HttpGet("{id:long}")]
        public async Task<IActionResult> Get(long id, CancellationToken ct)
        {
            var investor = await _repo.GetByIdAsync(id, ct);
            if (investor is null) return NotFound();

            return Ok(new
            {
                investor.Id,
                investor.FullName,
                investor.Email,
                investor.Phone,
                investor.Status,
                investor.CreatedAtUtc
            });
        }

        public sealed class CreateInvestorRequest
        {
            public string FullName { get; set; } = default!;
            public string Email { get; set; } = default!;
            public string? Phone { get; set; }
        }
    }
}
