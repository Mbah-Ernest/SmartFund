using System;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Entities;
using SmartFund.Domain.Exceptions;

namespace SmartFund.Application.UseCases.Agreements;

public sealed class SignTrancheAgreement
{
    private readonly ITrancheRepository _trancheRepo;
    private readonly IAgreementRepository _agreementRepo;

    public SignTrancheAgreement(ITrancheRepository trancheRepo, IAgreementRepository agreementRepo)
    {
        _trancheRepo = trancheRepo;
        _agreementRepo = agreementRepo;
    }

    public async Task<(long AgreementId, int Version)> ExecuteAsync(
        long trancheId,
        string signedName,
        string documentUrl,
        DateTime utcNow,
        CancellationToken ct)
    {
        var tranche = await _trancheRepo.GetByIdAsync(trancheId, ct);
        if (tranche is null)
            throw new DomainException("Tranche not found.");

        var latest = await _agreementRepo.GetLatestVersionAsync(trancheId, ct) ?? 0;
        var version = latest + 1;

        var agreement = Agreement.Create(
            trancheId: trancheId,
            version: version,
            signedName: signedName,
            signedAtUtc: utcNow,
            documentUrl: documentUrl);

        await _agreementRepo.AddAsync(agreement, ct);
        await _agreementRepo.SaveChangesAsync(ct);

        return (agreement.Id, version);
    }
}
