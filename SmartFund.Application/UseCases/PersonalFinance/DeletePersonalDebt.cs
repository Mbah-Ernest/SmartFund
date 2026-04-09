using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Application.Services;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Application.UseCases.PersonalFinance
{
    public sealed class DeletePersonalDebt
    {
        private readonly IPersonalDebtRepository _debts;
        private readonly UserAuthService _auth;

        public DeletePersonalDebt(IPersonalDebtRepository debts, UserAuthService auth)
        {
            _debts = debts;
            _auth = auth;
        }

        public async Task ExecuteAsync(long userId, long debtId, string pin, CancellationToken ct)
        {
            if (!await _auth.VerifyPasswordAsync(userId, pin, ct))
                throw new DomainException("Invalid PIN.");

            var debt = await _debts.GetByIdForUserAsync(debtId, userId, ct);
            if (debt is null)
                throw new DomainException("Debt not found.");

            await _debts.RemoveAsync(debt, ct);
            await _debts.SaveChangesAsync(ct);
        }
    }
}
