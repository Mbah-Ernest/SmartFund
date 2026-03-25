using System;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using SmartFund.Application.Interfaces;
using SmartFund.Domain.Agent;
using SmartFund.Domain.Enums;
using SmartFund.Domain.Exceptions;
using SmartFund.Domain.PersonalBudget.Entities;
using SmartFund.Domain.PersonalBudget.Enums;

namespace SmartFund.Application.Services.Agent
{
    // ── Payload shapes stored inside PendingAgentAction.PayloadJson ──────────

    public sealed record TransferPayload(
        long FromWalletId, long ToWalletId, decimal AmountNaira, string? Description);

    public sealed record CreateBudgetPayload(
        long CategoryId, decimal AmountNaira, string Period);

    // ── Result returned to the controller / LLM ───────────────────────────────

    public sealed record PendingActionSummary(
        Guid PendingActionId, string Summary, int ExpiresInSeconds);

    // ── Service ───────────────────────────────────────────────────────────────

    public sealed class AgentActionService
    {
        private readonly IPendingAgentActionRepository _pendingRepo;
        private readonly IPersonalTransactionService _txService;
        private readonly IPersonalBudgetRepository _budgetRepo;
        private readonly IAuditService _audit;
        private readonly IPersonalCategoryRepository _categoryRepo;
        private readonly IPersonalWalletService _walletService;

        public AgentActionService(
            IPendingAgentActionRepository pendingRepo,
            IPersonalTransactionService txService,
            IPersonalBudgetRepository budgetRepo,
            IAuditService audit,
            IPersonalCategoryRepository categoryRepo,
            IPersonalWalletService walletService)
        {
            _pendingRepo = pendingRepo;
            _txService = txService;
            _budgetRepo = budgetRepo;
            _audit = audit;
            _categoryRepo = categoryRepo;
            _walletService = walletService;
        }

        // ── Tier 3: Action Tools ─────────────────────────────────────────────

        public async Task<PendingActionSummary> InitiateTransferAsync(
            string userId,
            long fromWalletId, long toWalletId,
            decimal amountNaira, string? description,
            CancellationToken ct)
        {
            var payload = new TransferPayload(fromWalletId, toWalletId, amountNaira, description);
            var wallets = await _walletService.GetAllWalletsAsync(ct);
            var walletMap = wallets.ToDictionary(w => w.Id, w => w.Name);
            var fromName = walletMap.TryGetValue(fromWalletId, out var fn) ? fn : $"Wallet #{fromWalletId}";
            var toName   = walletMap.TryGetValue(toWalletId,   out var tn) ? tn : $"Wallet #{toWalletId}";
            var summary = $"Transfer ₦{amountNaira:N0} from {fromName} to {toName}" +
                          (string.IsNullOrWhiteSpace(description) ? "" : $" — {description}");

            var action = PendingAgentAction.Create(
                userId,
                "Transfer",
                JsonSerializer.Serialize(payload),
                summary,
                DateTime.UtcNow);

            await _pendingRepo.AddAsync(action, ct);
            await _pendingRepo.SaveChangesAsync(ct);

            return new PendingActionSummary(action.Id, summary, 300);
        }

        public async Task<PendingActionSummary> InitiateCreateBudgetAsync(
            string userId,
            long categoryId, decimal amountNaira, string period,
            CancellationToken ct)
        {
            var payload = new CreateBudgetPayload(categoryId, amountNaira, period);
            var cat = await _categoryRepo.GetByIdAsync(categoryId, ct);
            var catName = cat?.Name ?? $"category #{categoryId}";
            var summary = $"Create ₦{amountNaira:N0}/{period.ToLower()} budget for {catName}";

            var action = PendingAgentAction.Create(
                userId,
                "CreateBudget",
                JsonSerializer.Serialize(payload),
                summary,
                DateTime.UtcNow);

            await _pendingRepo.AddAsync(action, ct);
            await _pendingRepo.SaveChangesAsync(ct);

            return new PendingActionSummary(action.Id, summary, 300);
        }

        // ── Confirmation ─────────────────────────────────────────────────────

        public async Task<string> ConfirmActionAsync(string userId, Guid pendingActionId, CancellationToken ct)
        {
            var action = await _pendingRepo.GetByIdAsync(pendingActionId, ct)
                ?? throw new DomainException("Pending action not found.");

            if (action.UserId != userId)
                throw new DomainException("You are not authorised to confirm this action.");

            if (action.IsExpired(DateTime.UtcNow))
                throw new DomainException("This action has expired. Please initiate a new request.");

            string result;

            switch (action.ActionType)
            {
                case "Transfer":
                {
                    var payload = JsonSerializer.Deserialize<TransferPayload>(action.PayloadJson)!;
                    var txId = await _txService.RecordTransferAsync(
                        payload.FromWalletId,
                        payload.ToWalletId,
                        payload.AmountNaira,
                        payload.Description,
                        DateTime.UtcNow,
                        ct);

                    await _audit.RecordAsync(
                        AuditCategory.PersonalFinance,
                        $"[AI] Transfer",
                        $"AI-initiated transfer confirmed. {action.Summary} (pendingActionId={pendingActionId})",
                        null,
                        ct);

                    result = $"Transfer completed successfully. Transaction ID: {txId}.";
                    break;
                }

                case "CreateBudget":
                {
                    var payload = JsonSerializer.Deserialize<CreateBudgetPayload>(action.PayloadJson)!;
                    var period = Enum.TryParse<BudgetPeriod>(payload.Period, ignoreCase: true, out var p)
                        ? p
                        : BudgetPeriod.Monthly;

                    var existing = await _budgetRepo.GetByCategoryAsync(payload.CategoryId, period, ct);
                    if (existing is not null)
                    {
                        existing.UpdateAmount(payload.AmountNaira);
                    }
                    else
                    {
                        var budget = Budget.Create(payload.CategoryId, payload.AmountNaira, period);
                        await _budgetRepo.AddAsync(budget, ct);
                    }

                    await _budgetRepo.SaveChangesAsync(ct);

                    await _audit.RecordAsync(
                        AuditCategory.PersonalFinance,
                        $"[AI] CreateBudget",
                        $"AI-initiated budget creation confirmed. {action.Summary} (pendingActionId={pendingActionId})",
                        null,
                        ct);

                    result = $"Budget created successfully. ₦{payload.AmountNaira:N0}/{payload.Period.ToLower()} for category #{payload.CategoryId}.";
                    break;
                }

                default:
                    throw new DomainException($"Unknown action type: {action.ActionType}");
            }

            await _pendingRepo.DeleteAsync(action, ct);
            await _pendingRepo.SaveChangesAsync(ct);

            return result;
        }

        // ── Cancellation ─────────────────────────────────────────────────────

        public async Task CancelActionAsync(string userId, Guid pendingActionId, CancellationToken ct)
        {
            var action = await _pendingRepo.GetByIdAsync(pendingActionId, ct)
                ?? throw new DomainException("Pending action not found.");

            if (action.UserId != userId)
                throw new DomainException("You are not authorised to cancel this action.");

            await _pendingRepo.DeleteAsync(action, ct);
            await _pendingRepo.SaveChangesAsync(ct);
        }
    }
}
