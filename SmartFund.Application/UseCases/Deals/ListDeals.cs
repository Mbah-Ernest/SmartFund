using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;

namespace SmartFund.Application.UseCases.Deals
{
    public sealed class ListDeals
    {
        private readonly IDealRepository _repo;

        public ListDeals(IDealRepository repo) => _repo = repo;

        public Task<List<Deal>> ExecuteAsync(CancellationToken ct) =>
            _repo.ListAsync(ct);
    }
}
