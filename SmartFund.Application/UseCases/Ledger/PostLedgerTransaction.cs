using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Application.UseCases.Ledger
{
    public sealed class PostLedgerTransaction
    {
        private readonly ILedgerTransactionRepository _repo;
        private readonly ILedgerSequenceGenerator _sequence;

        public PostLedgerTransaction(
            ILedgerTransactionRepository repo,
            ILedgerSequenceGenerator sequence)
        {
            _repo = repo;
            _sequence = sequence;
        }

        public async Task<string> ExecuteAsync(long transactionId, long postedByUserId, DateTime utcNow, CancellationToken ct)
        {
            var tx = await _repo.GetAsync(transactionId, ct);
            if (tx is null)
                throw new DomainException("Ledger transaction not found.");

            if (tx.Status != SmartFund.Domain.Enums.TransactionStatus.Draft)
                throw new DomainException("Only draft transactions can be posted.");

            var seq = await _sequence.NextAsync(utcNow, ct);

            tx.Post(utcNow, postedByUserId, seq);

            await _repo.SaveChangesAsync(ct);

            return seq;
        }
    }
}