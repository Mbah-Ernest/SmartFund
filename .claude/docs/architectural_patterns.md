# Architectural Patterns

---

## 1. Clean Architecture (Layered Dependency Rule)

**Intent:** Keep business logic independent of infrastructure concerns. Each layer may only depend inward — Domain has no deps; Application depends only on Domain; Persistence and API depend on Application.

**Where it appears:**
- `SmartFund.Domain/Entities/Tranche.cs:1–3` — zero infrastructure imports
- `SmartFund.Application/UseCases/Tranches/CreateTranche.cs:4–8` — imports Domain and Application interfaces only, never EF or SQL
- `SmartFund.Persistence/Repositories/TrancheRepository.cs:1–5` — imports Application interfaces, fulfils them with EF
- `SmartFund.API/Program.cs:60–105` — wires interfaces to implementations at the composition root only

**How to extend it:**
1. New entity → add to `SmartFund.Domain/Entities/`
2. New operation → add a use case class to `SmartFund.Application/UseCases/<Feature>/`
3. New data access method → add to the interface in `SmartFund.Application/Interfaces/`, implement in `SmartFund.Persistence/Repositories/`
4. Register the new use case and repo in `Program.cs` under the relevant section

**Anti-patterns to avoid:**
- Do not reference `Microsoft.EntityFrameworkCore` or `SmartFund.Persistence` from Application or Domain
- Do not put business rules (capacity checks, ROI comparisons) in repositories or controllers — they belong in use cases or domain entities
- Do not add a new public constructor to domain entities to bypass `Create()`

---

## 2. Repository Pattern

**Intent:** Abstract all data access behind interfaces defined in the Application layer so that use cases are testable and the persistence technology is swappable.

**Where it appears:**
- `SmartFund.Application/Interfaces/ITrancheRepository.cs` — contract
- `SmartFund.Persistence/Repositories/TrancheRepository.cs:13–46` — EF implementation
- `SmartFund.Application/Interfaces/ILedgerTransactionRepository.cs` — contract
- `SmartFund.Persistence/Repositories/LedgerTransactionRepository.cs` — EF implementation
- `SmartFund.Application/Interfaces/IDealRepository.cs` / `SmartFund.Persistence/Repositories/DealRepository.cs`

**How to extend it:**
1. Declare method on the `I*Repository` interface in `SmartFund.Application/Interfaces/`
2. Implement in the concrete repo in `SmartFund.Persistence/Repositories/`
3. Register with `AddScoped` in `Program.cs:60–85`
4. Inject the interface (not the concrete class) into the use case constructor

**Anti-patterns to avoid:**
- Do not inject `SmartFundDbContext` directly into use cases — always go through the interface
- Do not call `SaveChangesAsync` inside the repository itself except via the explicit `SaveChangesAsync()` method on the interface; let the use case control when changes are committed
- Do not add query logic to use cases with `_db.Set<T>().Where(...)` — keep EF queries inside the repository

---

## 3. Use Case Pattern (Single-Responsibility Application Service)

**Intent:** Each business operation is a separate class with a single `ExecuteAsync` method. This keeps operations independently testable, prevents controller bloat, and makes the DI registration explicit.

**Where it appears:**
- `SmartFund.Application/UseCases/Tranches/CreateTranche.cs:37` — capacity + ROI enforcement, entity creation, ledger account creation, audit
- `SmartFund.Application/UseCases/Tranches/FundTranche.cs:34` — tranche lookup, double-entry ledger write, audit
- `SmartFund.Application/UseCases/Tranches/PayTrancheInvestor.cs` — payout ledger write + audit
- `SmartFund.Application/UseCases/Deals/CreateDeal.cs` — deal entity creation + audit
- `SmartFund.Application/UseCases/Insurance/FundInsuranceWallet.cs` — insurance wallet top-up with ledger entry

**How to extend it:**
1. Create `SmartFund.Application/UseCases/<Feature>/<VerbNoun>.cs` — `sealed` class, constructor injection only
2. Expose one `public async Task<TResult> ExecuteAsync(...)` method
3. Put all business rule validation at the top of `ExecuteAsync` before any writes
4. End with `await _audit.RecordAsync(...)` for any state-changing operation
5. Register in `Program.cs` with `builder.Services.AddScoped<YourUseCase>()`

**Anti-patterns to avoid:**
- Do not give a use case more than one `ExecuteAsync` overload that does meaningfully different things — the orphaned stub at `CreateTranche.cs:158` (throws `NotImplementedException`) shows the risk
- Do not share state between two use cases by calling one from the other — use a shared service (like `AuditService`) instead
- Do not return domain entities from use cases — return a value tuple or a lightweight record with only what the controller needs

---

## 4. Double-Entry Ledger Pattern

**Intent:** Every financial movement creates a `LedgerTransaction` with at least one debit entry and one credit entry that balance to zero. This provides an immutable financial audit trail and prevents money from being "created" or "lost" in the system.

**Where it appears:**
- `SmartFund.Domain/Entities/LedgerTransaction.cs:80–84` — `Post()` enforces balance before persisting
- `SmartFund.Domain/Entities/LedgerTransaction.cs:92–112` — `CreateReversal()` flips debits/credits automatically
- `SmartFund.Application/UseCases/Tranches/FundTranche.cs:40+` — debit bank account, credit investor liability
- `SmartFund.Application/Services/AuditService.cs:64–79` — reversal recreates a mirror ledger transaction
- `SmartFund.Seeder/Program.cs:358–395` — shows the canonical debit + credit pattern for income

**How to extend it:**
1. Call `LedgerTransaction.CreateDraft(narration, referenceType, referenceId)` — always set a `ReferenceType` and `ReferenceId` for traceability
2. Add entries with `AddDebit(accountId, Money.NGN(amount))` and `AddCredit(accountId, Money.NGN(amount))`
3. Ensure Σ debits = Σ credits before calling `Post(utcNow, userId, sequenceNumber)` — the domain will reject if unbalanced
4. Obtain the sequence number from `ILedgerSequenceGenerator.NextAsync(utcNow, ct)` — never hard-code or fabricate one
5. Persist with `_txRepo.AddAsync(tx, ct)` then `_txRepo.SaveChangesAsync(ct)`

**Anti-patterns to avoid:**
- Do not call `Post()` before all entries are added — entries cannot be added after posting (`EnsureDraft()` at `LedgerTransaction.cs:122`)
- Do not pass raw `decimal` to ledger methods — wrap in `Money.NGN(amount)` to enforce 2 dp and non-negative constraint
- Do not manually reverse a transaction by creating new entries — use `CreateReversal()` so the `ReversesTransactionId` link is maintained
- Do not reuse a sequence number across transactions — always fetch a fresh one from the generator

---

## 5. Domain Entity: Sealed Class + Factory Method + Private Setters

**Intent:** Prevent invalid entity state. All invariants are checked once at construction; external code cannot mutate properties directly.

**Where it appears:**
- `SmartFund.Domain/Entities/Tranche.cs:7,30,76` — `sealed`, private ctor, `Create()` factory
- `SmartFund.Domain/Entities/LedgerTransaction.cs:10,27,36` — `sealed`, private ctor, `CreateDraft()` factory
- `SmartFund.Domain/Entities/Investor.cs` — same pattern
- `SmartFund.Domain/Entities/Deal.cs` — same pattern
- `SmartFund.Domain/Entities/AuditEntry.cs` — `Create()` and `CreateReversal()` factories

**How to extend it:**
1. Declare the class `public sealed class`
2. Add a `private Entity() { }` parameterless constructor for EF only
3. Add a `private Entity(...)` constructor with all required parameters; throw `DomainException` for every constraint violation
4. Expose a `public static Entity Create(...)` that calls the private constructor
5. All properties: `public T Foo { get; private set; }`
6. Post-creation mutations (e.g., `SetLiabilityAccount`): expose an explicit `void` method with its own guard — `Tranche.cs:90–94`

**Anti-patterns to avoid:**
- Do not add `{ get; set; }` (public setter) to entity properties — EF does not need them
- Do not put infrastructure logic (EF queries, HTTP calls) inside entity methods
- Do not subclass domain entities — `sealed` is intentional

---

## 6. EF Core Fluent Configuration (IEntityTypeConfiguration<T>)

**Intent:** Keep EF mapping concerns entirely out of domain entities. Each entity has exactly one configuration class in `SmartFund.Persistence/Configurations/`.

**Where it appears:**
- `SmartFund.Persistence/Configurations/TrancheConfiguration.cs:7–52` — column types, unique index, FK with `Restrict` delete
- `SmartFund.Persistence/Configurations/LedgerTransactionConfiguration.cs:7–36` — navigation property uses `PropertyAccessMode.Field` to allow EF to populate the private `_entries` list
- `SmartFund.Persistence/Configurations/LedgerEntryConfiguration.cs`
- `SmartFund.Persistence/Configurations/InvestorConfiguration.cs`
- `SmartFund.Persistence/Configurations/AuditEntryConfiguration.cs`

**How to extend it:**
1. Create `SmartFund.Persistence/Configurations/<Entity>Configuration.cs` implementing `IEntityTypeConfiguration<Entity>`
2. Register it by calling `builder.ApplyConfigurationsFromAssembly(typeof(SmartFundDbContext).Assembly)` (or add `modelBuilder.ApplyConfiguration(new YourConfig())` — verify current DbContext approach)
3. For private collection fields (like `_entries`): use `builder.Navigation(x => x.Collection).UsePropertyAccessMode(PropertyAccessMode.Field)`
4. Always specify `HasColumnType("decimal(18,2)")` for money columns; use `decimal(9,6)` for rate/percentage columns
5. Use `OnDelete(DeleteBehavior.Restrict)` for FK relationships to prevent accidental cascade deletes on financial data

**Anti-patterns to avoid:**
- Do not use Data Annotations (`[Required]`, `[MaxLength]`) on domain entities — all mapping lives in the configuration classes
- Do not set `OnDelete(DeleteBehavior.Cascade)` on financial tables without explicit review — loss of ledger entries is unrecoverable

---

## 7. DomainException Error Boundary

**Intent:** Business rule violations surface as HTTP 400 without boilerplate try/catch in every controller. The filter intercepts `DomainException` before ASP.NET's default 500 handler.

**Where it appears:**
- `SmartFund.Domain/Exceptions/DomainException.cs` — the exception type
- `SmartFund.API/Filters/DomainExceptionFilter.cs:7–28` — converts to `ProblemDetails` with status 400
- `SmartFund.API/Program.cs:20` — filter registered globally via `options.Filters.Add<DomainExceptionFilter>()`
- Thrown throughout domain entities: `Tranche.cs:46,48,51,54,57,60`
- Thrown in use cases: `CreateTranche.cs:53,56,59,63,66,73,81,95`

**How to extend it:**
- Throw `new DomainException("Human-readable message")` for any business constraint violation anywhere in Domain or Application layers
- Do not add HTTP status codes or JSON serialization to `DomainException` — the filter owns that concern
- For unexpected/infrastructure errors, let them bubble as unhandled exceptions (500)

**Anti-patterns to avoid:**
- Do not catch `DomainException` in a use case or controller to re-throw a different type — the filter must see the original exception
- Do not use `DomainException` for null-reference bugs or unexpected states — only for intentional business rule rejections

---

## 8. Audit Trail Pattern

**Intent:** Every state-changing business operation records an `AuditEntry` linked (optionally) to its `LedgerTransaction`. Reversals are tracked bidirectionally via `ReversesAuditEntryId` / `ReversedByAuditEntryId`.

**Where it appears:**
- `SmartFund.Application/Services/AuditService.cs:33–43` — `RecordAsync` creates and persists an entry
- `SmartFund.Application/Services/AuditService.cs:45–90` — `ReverseAsync` reverses both the ledger transaction and the audit entry
- `SmartFund.Application/UseCases/Tranches/CreateTranche.cs:131–136` — audit call at end of use case
- `SmartFund.Application/UseCases/Tranches/FundTranche.cs` — audit after funding ledger write
- `SmartFund.Domain/Entities/AuditEntry.cs` — `CreateReversal()` links entries bidirectionally

**How to extend it:**
1. Inject `IAuditService` into the use case
2. Call `await _audit.RecordAsync(AuditCategory.X, "Verb Noun", $"description with key IDs", ledgerTxId, ct)` at the end of the operation, after all saves
3. Choose an existing `AuditCategory` enum value or add a new one to `SmartFund.Domain/Enums/AuditCategory.cs`
4. Pass the `LedgerTransaction.Id` when the action produced a ledger transaction; pass `null` for non-financial actions

**Anti-patterns to avoid:**
- Do not record audit entries before saves — if the operation rolls back, the audit entry persists (EF tracks them separately)
- Do not call `AuditService.ReverseAsync` directly from a controller without verifying the PIN — the PIN check is inside the service but the controller must not bypass it
- Do not create `AuditEntry` domain objects directly in use cases — always go through `IAuditService`
