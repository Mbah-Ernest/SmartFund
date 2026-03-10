using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.Tranches;
using SmartFund.Application.UseCases.Tranches;
using SmartFund.Domain.Enums;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/tranches")]
    public sealed class TranchesController : ControllerBase
    {
        private readonly CreateTranche _useCase;
            private readonly ListTranches _list;
        private readonly FundTranche _fundTranche;
        private readonly PayTrancheInvestor _payTrancheInvestor;
        private readonly SmartFund.Application.UseCases.Agreements.SignTrancheAgreement _signAgreement;

        public TranchesController(
            CreateTranche useCase,
                ListTranches list,
            FundTranche fundTranche,
            PayTrancheInvestor payTrancheInvestor,
            SmartFund.Application.UseCases.Agreements.SignTrancheAgreement signAgreement)
        {
            _useCase = useCase;
                _list = list;
            _fundTranche = fundTranche;
            _payTrancheInvestor = payTrancheInvestor;
            _signAgreement = signAgreement;
        }

            [HttpGet]
            public async Task<IActionResult> List(CancellationToken ct)
            {
                var utcNow = DateTime.UtcNow.Date;
                var tranches = await _list.ExecuteAsync(ct);

                return Ok(tranches.Select(t => new
                {
                    t.Id,
                    t.TrancheCode,
                    t.DealId,
                    t.InvestorId,
                    principal = t.Principal,
                    status = utcNow < t.StartDate.Date
                        ? "Pending"
                        : utcNow > t.MaturityDate.Date
                            ? "Matured"
                            : "Active"
                }));
            }

        [HttpPost("{id}/fund")]
        public async Task<IActionResult> Fund(
            long id,
            FundTrancheRequest request,
            CancellationToken ct)
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!long.TryParse(userIdValue, out var userId) || userId <= 0)
                return Unauthorized();

            var txId = await _fundTranche.ExecuteAsync(
                id,
                request.Amount,
                request.BankAccountId,
                userId,
                ct);

            return Ok(new { transactionId = txId });
        }

        [HttpPost("{id}/agreement")]
        public async Task<IActionResult> SignAgreement(
            long id,
            SignTrancheAgreementRequest request,
            CancellationToken ct)
        {
            var result = await _signAgreement.ExecuteAsync(
                trancheId: id,
                signedName: request.SignedName,
                documentUrl: request.DocumentUrl,
                utcNow: DateTime.UtcNow,
                ct: ct);

            return Ok(new { result.AgreementId, result.Version });
        }

        [HttpPost("{id}/payout")]
        public async Task<IActionResult> Payout(
            long id,
            PayTrancheInvestorRequest request,
            CancellationToken ct)
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!long.TryParse(userIdValue, out var userId) || userId <= 0)
                return Unauthorized();

            var txId = await _payTrancheInvestor.ExecuteAsync(
                id,
                request.Amount,
                request.BankAccountId,
                userId,
                ct);

            return Ok(new { transactionId = txId });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTrancheRequest request, CancellationToken ct)
        {
            var result = await _useCase.ExecuteAsync(
                request.InvestorId,
                request.DealId,
                request.Principal,
                request.RoiType,
                request.RoiRate,
                request.StartDate,
                request.MaturityDate,
                request.PayoutType,
                request.NoticeDays,
                request.EarlyWithdrawalPolicy,
                DateTime.UtcNow,
                ct);

            return Ok(new
            {
                result.TrancheId,
                result.TrancheCode,
                result.LiabilityAccountId
            });
        }

        public sealed class CreateTrancheRequest
        {
            public long InvestorId { get; set; }
            public long? DealId { get; set; }
            public decimal Principal { get; set; }
            public RoiType RoiType { get; set; }
            public decimal RoiRate { get; set; }
            public DateTime StartDate { get; set; }
            public DateTime MaturityDate { get; set; }
            public PayoutType PayoutType { get; set; }
            public int? NoticeDays { get; set; }
            public EarlyWithdrawalPolicy EarlyWithdrawalPolicy { get; set; }
        }
    }
}