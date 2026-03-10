using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;

namespace SmartFund.Application.UseCases.Deals
{
    public sealed class GetDeal
    {
        private readonly IDealRepository _repo;

        public GetDeal(IDealRepository repo) => _repo = repo;

        public Task<Deal?> ExecuteAsync(long id, CancellationToken ct) =>
            _repo.GetByIdAsync(id, ct);
    }
}
