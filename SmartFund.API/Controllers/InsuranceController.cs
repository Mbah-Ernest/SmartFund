using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.Insurance;
using SmartFund.Application.UseCases.Insurance;
using SmartFund.Domain.Exceptions;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/insurance")]
    public sealed class InsuranceController : ControllerBase
    {
        private readonly FundInsuranceWallet _fund;
        private readonly UseInsuranceWallet _use;

        public InsuranceController(FundInsuranceWallet fund, UseInsuranceWallet use)
        {
            _fund = fund;
            _use = use;
        }

        [HttpPost("fund")]
        public async Task<IActionResult> Fund([FromBody] FundInsuranceRequest request, CancellationToken ct)
        {
            try
            {
                var txId = await _fund.ExecuteAsync(
                    request.WalletType,
                    request.DealId,
                    request.Amount,
                    request.BankAccountId,
                    request.ReceivedByUserId,
                    ct);

                return Ok(new { transactionId = txId });
            }
            catch (DomainException ex)
            {
                return BadRequest(ex.Message);
            }
        }

        [HttpPost("use")]
        public async Task<IActionResult> Use([FromBody] UseInsuranceRequest request, CancellationToken ct)
        {
            try
            {
                var txId = await _use.ExecuteAsync(
                    request.TrancheId,
                    request.Amount,
                    request.UsedByUserId,
                    ct);

                return Ok(new { transactionId = txId });
            }
            catch (DomainException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}
