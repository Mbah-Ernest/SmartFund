using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Agent;
using SmartFund.Persistence.DbContext;

namespace SmartFund.Persistence.Repositories
{
    public sealed class PendingAgentActionRepository : IPendingAgentActionRepository
    {
        private readonly SmartFundDbContext _db;

        public PendingAgentActionRepository(SmartFundDbContext db) => _db = db;

        public Task<PendingAgentAction?> GetByIdAsync(Guid id, CancellationToken ct) =>
            _db.PendingAgentActions.FindAsync(new object[] { id }, ct).AsTask()!;

        public async Task AddAsync(PendingAgentAction action, CancellationToken ct) =>
            await _db.PendingAgentActions.AddAsync(action, ct);

        public Task DeleteAsync(PendingAgentAction action, CancellationToken ct)
        {
            _db.PendingAgentActions.Remove(action);
            return Task.CompletedTask;
        }

        public Task SaveChangesAsync(CancellationToken ct) =>
            _db.SaveChangesAsync(ct);
    }
}
