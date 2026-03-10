using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;

namespace SmartFund.Application.UseCases.Tranches
{
    public sealed class ListTranches
    {
        private readonly ITrancheRepository _repo;

        public ListTranches(ITrancheRepository repo) => _repo = repo;

        public Task<List<Tranche>> ExecuteAsync(CancellationToken ct) =>
            _repo.ListAsync(ct);
    }
}
