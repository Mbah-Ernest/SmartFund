using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SmartFund.API.Contracts.PersonalFinance;
using SmartFund.Application.Interfaces;
using System.Threading;
using System.Threading.Tasks;

namespace SmartFund.API.Controllers
{
    [ApiController]
    [Authorize]
    [Route("api/personal-transactions")]
    public sealed class PersonalTransactionController : ControllerBase
    {
        private readonly IPersonalTransactionService _tx;
        private readonly IPersonalInvestmentContributionService _contributions;

        public PersonalTransactionController(
            IPersonalTransactionService tx,
            IPersonalInvestmentContributionService contributions)
        {
            _tx = tx;
            _contributions = contributions;
        }

        [HttpPost("income")]
        public async Task<ActionResult<RecordTransactionResponse>> RecordIncome(
            [FromBody] RecordIncomeRequest request,
            CancellationToken ct)
        {
            var ledgerTxId = await _tx.RecordIncomeAsync(
                request.WalletId,
                request.CategoryId,
                request.Amount,
                request.Description,
                request.Date,
                ct);

            return Ok(new RecordTransactionResponse { LedgerTransactionId = ledgerTxId });
        }

        [HttpPost("expense")]
        public async Task<ActionResult<RecordTransactionResponse>> RecordExpense(
            [FromBody] RecordExpenseRequest request,
            CancellationToken ct)
        {
            var ledgerTxId = await _tx.RecordExpenseAsync(
                request.WalletId,
                request.CategoryId,
                request.Amount,
                request.Description,
                request.Date,
                ct);

            return Ok(new RecordTransactionResponse { LedgerTransactionId = ledgerTxId });
        }

        [HttpPost("transfer")]
        public async Task<ActionResult<RecordTransactionResponse>> RecordTransfer(
            [FromBody] RecordTransferRequest request,
            CancellationToken ct)
        {
            var ledgerTxId = await _tx.RecordTransferAsync(
                request.SourceWalletId,
                request.DestinationWalletId,
                request.Amount,
                request.Description,
                request.Date,
                ct);

            return Ok(new RecordTransactionResponse { LedgerTransactionId = ledgerTxId });
        }

        [HttpPost("investment-contribution")]
        public async Task<ActionResult<RecordTransactionResponse>> RecordInvestmentContribution(
            [FromBody] RecordInvestmentContributionRequest request,
            CancellationToken ct)
        {
            var ledgerTxId = await _contributions.ContributeAsync(
                request.WalletId,
                request.TrancheId,
                request.Amount,
                request.Description,
                ct);

            return Ok(new RecordTransactionResponse { LedgerTransactionId = ledgerTxId });
        }
    }
}
