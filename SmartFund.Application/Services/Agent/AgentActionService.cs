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
using SmartFund.Domain.PersonalFinance.Enums;

namespace SmartFund.Application.Services.Agent
{
    // ── Payload shapes stored inside PendingAgentAction.PayloadJson ──────────

    public sealed record TransferPayload(
        long FromWalletId, long ToWalletId, decimal AmountNaira, string? Description);

    public sealed record CreateBudgetPayload(
        long CategoryId, decimal AmountNaira, string Period);

    public sealed record LogExpensePayload(
        decimal AmountNaira, long CategoryId, long WalletId, string? Description, DateTime Date);

    public sealed record LogIncomePayload(
        decimal AmountNaira, long CategoryId, long WalletId, string? Description, DateTime Date);

    public sealed record UpdateBudgetPayload(long BudgetId, decimal NewAmountNaira);

    public sealed record UpdateGoalPayload(long GoalId, decimal NewTargetNaira, DateTime? NewDeadline);

    public sealed record RecordDebtPaymentPayload(
        long DebtId, decimal AmountNaira, string? Note, DateTime PaidOn);

    public sealed record CreateDebtPayload(
        string CreditorName, decimal PrincipalAmount, decimal TotalAmountDue,
        DateTime DueDate, string? Description);

    public sealed record ContributeToGoalPayload(long GoalId, decimal AmountNaira, long? FromWalletId);

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
        private readonly IPersonalGoalRepository _goalRepo;
        private readonly IPersonalDebtRepository _debtRepo;

        public AgentActionService(
            IPendingAgentActionRepository pendingRepo,
            IPersonalTransactionService txService,
            IPersonalBudgetRepository budgetRepo,
            IAuditService audit,
            IPersonalCategoryRepository categoryRepo,
            IPersonalWalletService walletService,
            IPersonalGoalRepository goalRepo,
            IPersonalDebtRepository debtRepo)
        {
            _pendingRepo = pendingRepo;
            _txService = txService;
            _budgetRepo = budgetRepo;
            _audit = audit;
            _categoryRepo = categoryRepo;
            _walletService = walletService;
            _goalRepo = goalRepo;
            _debtRepo = debtRepo;
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

        public async Task<PendingActionSummary> InitiateLogExpenseAsync(
            string userId, decimal amountNaira, long categoryId, long walletId,
            string? description, DateTime date, CancellationToken ct)
        {
            var payload = new LogExpensePayload(amountNaira, categoryId, walletId, description, date);
            var cat = await _categoryRepo.GetByIdAsync(categoryId, ct);
            var wallet = await _walletService.GetWalletAsync(walletId, ct);
            var catName = cat?.Name ?? $"category #{categoryId}";
            var walletName = wallet?.Name ?? $"wallet #{walletId}";
            var summary = $"Log ₦{amountNaira:N0} expense in {catName} from {walletName}";

            var action = PendingAgentAction.Create(userId, "LogExpense", JsonSerializer.Serialize(payload), summary, DateTime.UtcNow);
            await _pendingRepo.AddAsync(action, ct);
            await _pendingRepo.SaveChangesAsync(ct);
            return new PendingActionSummary(action.Id, summary, 300);
        }

        public async Task<PendingActionSummary> InitiateLogIncomeAsync(
            string userId, decimal amountNaira, long categoryId, long walletId,
            string? description, DateTime date, CancellationToken ct)
        {
            var payload = new LogIncomePayload(amountNaira, categoryId, walletId, description, date);
            var cat = await _categoryRepo.GetByIdAsync(categoryId, ct);
            var wallet = await _walletService.GetWalletAsync(walletId, ct);
            var catName = cat?.Name ?? $"category #{categoryId}";
            var walletName = wallet?.Name ?? $"wallet #{walletId}";
            var summary = $"Log ₦{amountNaira:N0} income in {catName} to {walletName}";

            var action = PendingAgentAction.Create(userId, "LogIncome", JsonSerializer.Serialize(payload), summary, DateTime.UtcNow);
            await _pendingRepo.AddAsync(action, ct);
            await _pendingRepo.SaveChangesAsync(ct);
            return new PendingActionSummary(action.Id, summary, 300);
        }

        public async Task<PendingActionSummary> InitiateUpdateBudgetAsync(
            string userId, long budgetId, decimal newAmountNaira, CancellationToken ct)
        {
            var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
            var budget = await _budgetRepo.GetByIdForUserAsync(budgetId, longUserId, ct)
                ?? throw new DomainException($"Budget #{budgetId} not found.");
            var cat = await _categoryRepo.GetByIdAsync(budget.CategoryId, ct);
            var catName = cat?.Name ?? $"category #{budget.CategoryId}";
            var summary = $"Update {catName} budget from ₦{budget.Amount:N0} to ₦{newAmountNaira:N0}/month";

            var payload = new UpdateBudgetPayload(budgetId, newAmountNaira);
            var action = PendingAgentAction.Create(userId, "UpdateBudget", JsonSerializer.Serialize(payload), summary, DateTime.UtcNow);
            await _pendingRepo.AddAsync(action, ct);
            await _pendingRepo.SaveChangesAsync(ct);
            return new PendingActionSummary(action.Id, summary, 300);
        }

        public async Task<PendingActionSummary> InitiateUpdateGoalTargetAsync(
            string userId, long goalId, decimal newTargetNaira, DateTime? newDeadline, CancellationToken ct)
        {
            var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
            var goal = await _goalRepo.GetByIdForUserAsync(goalId, longUserId, ct)
                ?? throw new DomainException($"Goal #{goalId} not found.");
            var summary = $"Update goal '{goal.Name}' target to ₦{newTargetNaira:N0}" +
                          (newDeadline.HasValue ? $" (deadline: {newDeadline.Value:yyyy-MM-dd})" : "");

            var payload = new UpdateGoalPayload(goalId, newTargetNaira, newDeadline);
            var action = PendingAgentAction.Create(userId, "UpdateGoal", JsonSerializer.Serialize(payload), summary, DateTime.UtcNow);
            await _pendingRepo.AddAsync(action, ct);
            await _pendingRepo.SaveChangesAsync(ct);
            return new PendingActionSummary(action.Id, summary, 300);
        }

        public async Task<PendingActionSummary> InitiateRecordDebtPaymentAsync(
            string userId, long debtId, decimal amountNaira, string? note, DateTime paidOn, CancellationToken ct)
        {
            var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
            var debt = await _debtRepo.GetByIdForUserAsync(debtId, longUserId, ct)
                ?? throw new DomainException($"Debt #{debtId} not found.");

            var summary = $"Record ₦{amountNaira:N0} payment on debt '{debt.CreditorName}' (remaining: ₦{debt.RemainingBalance:N0})";
            var payload = new RecordDebtPaymentPayload(debtId, amountNaira, note, paidOn);

            var action = PendingAgentAction.Create(userId, "RecordDebtPayment", JsonSerializer.Serialize(payload), summary, DateTime.UtcNow);
            await _pendingRepo.AddAsync(action, ct);
            await _pendingRepo.SaveChangesAsync(ct);
            return new PendingActionSummary(action.Id, summary, 300);
        }

        public async Task<PendingActionSummary> InitiateContributeToGoalAsync(
            string userId, long goalId, decimal amountNaira, long? fromWalletId, CancellationToken ct)
        {
            var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
            var goal = await _goalRepo.GetByIdForUserAsync(goalId, longUserId, ct)
                ?? throw new DomainException($"Goal #{goalId} not found.");

            string summary;
            if (goal.WalletId.HasValue)
            {
                var fromWallet = fromWalletId.HasValue
                    ? await _walletService.GetWalletAsync(fromWalletId.Value, ct)
                    : null;
                var fromName = fromWallet?.Name ?? (fromWalletId.HasValue ? $"Wallet #{fromWalletId}" : "your wallet");
                var goalWallet = await _walletService.GetWalletAsync(goal.WalletId.Value, ct);
                var goalWalletName = goalWallet?.Name ?? $"Wallet #{goal.WalletId}";
                summary = $"Transfer ₦{amountNaira:N0} from {fromName} to goal wallet '{goalWalletName}'";
            }
            else
            {
                summary = $"Contribute ₦{amountNaira:N0} to goal '{goal.Name}'";
            }

            var payload = new ContributeToGoalPayload(goalId, amountNaira, fromWalletId);
            var action = PendingAgentAction.Create(userId, "ContributeToGoal", JsonSerializer.Serialize(payload), summary, DateTime.UtcNow);
            await _pendingRepo.AddAsync(action, ct);
            await _pendingRepo.SaveChangesAsync(ct);
            return new PendingActionSummary(action.Id, summary, 300);
        }

        public async Task<PendingActionSummary> InitiateCreateDebtAsync(
            string userId, string creditorName, decimal principalAmount, decimal totalAmountDue,
            DateTime dueDate, string? description, CancellationToken ct)
        {
            var summary = $"Track new debt: ₦{totalAmountDue:N0} owed to {creditorName} (due {dueDate:yyyy-MM-dd})";
            var payload = new CreateDebtPayload(creditorName, principalAmount, totalAmountDue, dueDate, description);

            var action = PendingAgentAction.Create(userId, "CreateDebt", JsonSerializer.Serialize(payload), summary, DateTime.UtcNow);
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
                    var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
                    var txId = await _txService.RecordTransferAsync(
                        longUserId,
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

                    var budgetUserId = long.TryParse(userId, out var buid) ? buid : 1L;
                    var existing = await _budgetRepo.GetByCategoryForUserAsync(budgetUserId, payload.CategoryId, period, ct);
                    if (existing is not null)
                    {
                        existing.UpdateAmount(payload.AmountNaira);
                    }
                    else
                    {
                        var budget = Budget.Create(budgetUserId, payload.CategoryId, payload.AmountNaira, period);
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

                case "LogExpense":
                {
                    var payload = JsonSerializer.Deserialize<LogExpensePayload>(action.PayloadJson)!;
                    var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
                    var txId = await _txService.RecordExpenseAsync(
                        longUserId, payload.WalletId, payload.CategoryId,
                        payload.AmountNaira, payload.Description, payload.Date, ct);
                    await _audit.RecordAsync(AuditCategory.PersonalFinance, "[AI] LogExpense",
                        $"AI-initiated expense confirmed. {action.Summary} (pendingActionId={pendingActionId})", null, ct);
                    result = $"Expense logged successfully. Transaction ID: {txId}.";
                    break;
                }

                case "LogIncome":
                {
                    var payload = JsonSerializer.Deserialize<LogIncomePayload>(action.PayloadJson)!;
                    var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
                    var txId = await _txService.RecordIncomeAsync(
                        longUserId, payload.WalletId, payload.CategoryId,
                        payload.AmountNaira, payload.Description, payload.Date, ct);
                    await _audit.RecordAsync(AuditCategory.PersonalFinance, "[AI] LogIncome",
                        $"AI-initiated income confirmed. {action.Summary} (pendingActionId={pendingActionId})", null, ct);
                    result = $"Income logged successfully. Transaction ID: {txId}.";
                    break;
                }

                case "UpdateBudget":
                {
                    var payload = JsonSerializer.Deserialize<UpdateBudgetPayload>(action.PayloadJson)!;
                    var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
                    var budget = await _budgetRepo.GetByIdForUserAsync(payload.BudgetId, longUserId, ct)
                        ?? throw new DomainException($"Budget #{payload.BudgetId} not found.");
                    budget.UpdateAmount(payload.NewAmountNaira);
                    await _budgetRepo.SaveChangesAsync(ct);
                    await _audit.RecordAsync(AuditCategory.PersonalFinance, "[AI] UpdateBudget",
                        $"AI-initiated budget update confirmed. {action.Summary} (pendingActionId={pendingActionId})", null, ct);
                    result = $"Budget updated successfully to ₦{payload.NewAmountNaira:N0}/month.";
                    break;
                }

                case "UpdateGoal":
                {
                    var payload = JsonSerializer.Deserialize<UpdateGoalPayload>(action.PayloadJson)!;
                    var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
                    var goal = await _goalRepo.GetByIdForUserAsync(payload.GoalId, longUserId, ct)
                        ?? throw new DomainException($"Goal #{payload.GoalId} not found.");
                    goal.UpdateTarget(payload.NewTargetNaira);
                    if (payload.NewDeadline.HasValue)
                        goal.UpdateDeadline(payload.NewDeadline.Value);
                    await _goalRepo.SaveChangesAsync(ct);
                    await _audit.RecordAsync(AuditCategory.PersonalFinance, "[AI] UpdateGoal",
                        $"AI-initiated goal update confirmed. {action.Summary} (pendingActionId={pendingActionId})", null, ct);
                    result = $"Goal updated successfully.";
                    break;
                }

                case "RecordDebtPayment":
                {
                    var payload = JsonSerializer.Deserialize<RecordDebtPaymentPayload>(action.PayloadJson)!;
                    var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
                    var debt = await _debtRepo.GetByIdForUserAsync(payload.DebtId, longUserId, ct)
                        ?? throw new DomainException($"Debt #{payload.DebtId} not found.");

                    debt.RecordPayment(payload.AmountNaira, payload.PaidOn, payload.Note);
                    await _debtRepo.SaveChangesAsync(ct);

                    await _audit.RecordAsync(
                        AuditCategory.PersonalFinance,
                        "[AI] RecordDebtPayment",
                        $"AI-initiated debt payment confirmed. {action.Summary} (pendingActionId={pendingActionId})",
                        null, ct);

                    result = $"Payment of ₦{payload.AmountNaira:N0} recorded on debt '{debt.CreditorName}'. Remaining balance: ₦{debt.RemainingBalance:N0}.";
                    break;
                }

                case "ContributeToGoal":
                {
                    var payload = JsonSerializer.Deserialize<ContributeToGoalPayload>(action.PayloadJson)!;
                    var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;
                    var goal = await _goalRepo.GetByIdForUserAsync(payload.GoalId, longUserId, ct)
                        ?? throw new DomainException($"Goal #{payload.GoalId} not found.");

                    if (goal.WalletId.HasValue)
                    {
                        var fromWalletId = payload.FromWalletId
                            ?? throw new DomainException("A source wallet is required to transfer to a wallet-linked goal.");
                        await _txService.RecordTransferAsync(
                            longUserId,
                            fromWalletId,
                            goal.WalletId.Value,
                            payload.AmountNaira,
                            $"Contribution to goal '{goal.Name}'",
                            DateTime.UtcNow,
                            ct);
                    }
                    else
                    {
                        goal.Contribute(payload.AmountNaira);
                        await _goalRepo.SaveChangesAsync(ct);
                    }

                    await _audit.RecordAsync(
                        AuditCategory.PersonalFinance,
                        "[AI] ContributeToGoal",
                        $"AI-initiated goal contribution confirmed. {action.Summary} (pendingActionId={pendingActionId})",
                        null, ct);

                    result = $"Contribution of ₦{payload.AmountNaira:N0} to goal '{goal.Name}' completed successfully.";
                    break;
                }

                case "CreateDebt":
                {
                    var payload = JsonSerializer.Deserialize<CreateDebtPayload>(action.PayloadJson)!;
                    var longUserId = long.TryParse(userId, out var uid) ? uid : 1L;

                    var debt = SmartFund.Domain.PersonalFinance.Entities.PersonalDebt.Create(
                        longUserId,
                        payload.CreditorName,
                        payload.PrincipalAmount,
                        payload.TotalAmountDue,
                        payload.DueDate,
                        payload.Description);

                    await _debtRepo.AddAsync(debt, ct);
                    await _debtRepo.SaveChangesAsync(ct);

                    await _audit.RecordAsync(
                        AuditCategory.PersonalFinance,
                        "[AI] CreateDebt",
                        $"AI-initiated debt creation confirmed. {action.Summary} (pendingActionId={pendingActionId})",
                        null, ct);

                    result = $"Debt tracked successfully. ₦{payload.TotalAmountDue:N0} owed to {payload.CreditorName}, due {payload.DueDate:yyyy-MM-dd}.";
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
