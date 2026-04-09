# Build Service Module — SmartFund

Use this skill to scaffold a complete feature module following SmartFund's Clean Architecture layers.

---

## Steps

1. **Read the spec** — read only the spec/plan file the user provides. Do not audit the whole codebase.

2. **Domain entity** (if new) — add a sealed entity with private setters + static `Create(...)` factory in `SmartFund.Domain/Entities/`. Register an `IEntityTypeConfiguration<T>` in `SmartFund.Persistence/Configurations/`.

3. **Repository interface** — add `IXxxRepository.cs` in `SmartFund.Application/Interfaces/`. Extend `SmartFund.Persistence/Repositories/` with the concrete implementation and register it in `SmartFund.API/Program.cs`.

4. **Use cases** — one class per operation in `SmartFund.Application/UseCases/<Feature>/`. Each exposes a single `ExecuteAsync`. Use cases own `SaveChangesAsync` — never call it inside entities or repos mid-operation.

5. **Controller** — add `XxxController.cs` in `SmartFund.API/Controllers/`. Keep it thin: call one use case, return `Ok(anonymous shape)`. No separate DTO classes for responses.

6. **EF migration** — run:
   ```
   dotnet ef migrations add <Name> -p SmartFund.Persistence -s SmartFund.API
   dotnet ef database update -p SmartFund.Persistence -s SmartFund.API
   ```
   Stop the API server first to avoid DLL lock issues. Use the Edit tool if migration files need manual changes — never sed.

7. **Build check** — run `dotnet build` after each layer. Fix all errors before proceeding to the next step.

8. **Frontend** (if required) — add a page under `SmartFund.Web/src/pages/`. Follow the page structure convention from CLAUDE.md. Wire to the API via Axios. Use only components from `@/components/ui/`.

9. **Report** — list every file created/modified and confirm the build is clean.

---

## Reference patterns (read one, then build — don't over-explore)

| Layer | Reference file |
|---|---|
| Domain entity | `SmartFund.Domain/Entities/` — any sealed entity |
| Use case | `SmartFund.Application/UseCases/Tranches/CreateTranche.cs` |
| Repository interface | `SmartFund.Application/Interfaces/IConnectedBankAccountRepository.cs` |
| Repository impl | `SmartFund.Persistence/Repositories/ConnectedBankAccountRepository.cs` |
| Controller | `SmartFund.API/Controllers/PersonalWalletController.cs` |
| EF config | `SmartFund.Persistence/Configurations/` — any config class |
| Frontend page | `SmartFund.Web/src/pages/` — any recent Personal Finance page |

---

## Hard rules

- `Money.NGN(decimal)` for all financial amounts — never raw `decimal` to ledger methods.
- `DomainException` for all business rule violations — never `ArgumentException` or `InvalidOperationException`.
- All dates stored as UTC midnight — use `DateTime.SpecifyKind(..., DateTimeKind.Utc)`.
- Controllers return anonymous shapes — no separate response DTO classes.
- Stub/placeholder service classes must implement all interface methods before moving on.
- Run `dotnet build` after every layer — never chain multiple edits without a build check.
