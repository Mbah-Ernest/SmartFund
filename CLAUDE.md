# SmartFund

## 1. Project Purpose

SmartFund is a Nigerian investment fund management platform for a fund operator (not a retail app). It tracks investor tranches inside deals, enforces double-entry bookkeeping on every cash movement, and records a full audit trail. A secondary personal-finance module lets individual users track wallets, budgets, and spending goals. The system is built for one fund operator running the backend locally or on-premise.

## 2. Tech Stack

- **Backend:** C# / .NET 10 (`net10.0`), ASP.NET Core 10.0.2, nullable reference types enabled
- **ORM:** Entity Framework Core 10.0.3 with SQL Server provider
- **Database:** SQL Server LocalDB (`(localdb)\mssqllocaldb`) — database `SmartFundDb`
- **Auth:** JWT Bearer (HS256), configured in `appsettings.json` under `Jwt:*`
- **API docs:** Swashbuckle/Swagger at `/swagger` in development
- **Frontend:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS 3, Recharts 2, React Router 6, Axios
- **Tests:** xUnit (`SmartFund.Tests`)

## 3. Project Map

```
SmartFund.Domain/          Core entities, value objects, enums, DomainException — no deps
SmartFund.Application/     Use cases + service interfaces (depends only on Domain)
  Interfaces/              Repository + service contracts consumed by use cases
  UseCases/                One class per operation; each exposes a single ExecuteAsync
  Services/                AuditService, PersonalWalletService, etc.
SmartFund.Persistence/     EF DbContext, repository implementations, EF Fluent configurations
  Configurations/          IEntityTypeConfiguration<T> classes — one per entity
  Repositories/            Concrete repos injected via interfaces
  Migrations/              EF code-first migration files
SmartFund.API/             ASP.NET Core host; controllers, request DTOs, filters
  Controllers/             Thin — call one use case, return Ok(anonymous shape)
  Filters/                 DomainExceptionFilter maps DomainException → 400 ProblemDetails
SmartFund.Infrastructure/  Placeholder — external services not yet wired
SmartFund.Seeder/          Standalone CLI; seeds realistic dev data, supports --reset flag
SmartFund.Web/             React SPA (separate dev server on :5173)
```

**Entry points:**
- API: `SmartFund.API/Program.cs:15`
- DI registrations: `SmartFund.API/Program.cs:60–105`
- Migration auto-run (dev only): `SmartFund.API/Program.cs:116–185`
- Seeder: `SmartFund.Seeder/Program.cs:1`
- Frontend: `SmartFund.Web/index.html`

## 4. Essential Commands

```bash
# Backend (run from repo root)
dotnet build
dotnet run --project SmartFund.API          # API on https://localhost:5001
dotnet test SmartFund.Tests

# Database migrations
dotnet ef migrations add <Name> -p SmartFund.Persistence -s SmartFund.API
dotnet ef database update -p SmartFund.Persistence -s SmartFund.API

# Seeder
dotnet run --project SmartFund.Seeder                      # idempotent seed
dotnet run --project SmartFund.Seeder -- --reset           # drop, migrate, re-seed
dotnet run --project SmartFund.Seeder -- --personal-finance # PF data only

# Frontend (from SmartFund.Web/)
npm install
npm run dev      # http://localhost:5173
npm run build    # tsc -b && vite build
npm run preview  # preview production build
```

**Environment requirements:**
- SQL Server LocalDB must be installed (ships with Visual Studio)
- `appsettings.json` `Jwt:Key` defaults to a dev placeholder — rotate before any shared deployment
- Default credentials: username `admin` / password `admin` (`Auth:Username`, `Auth:Password`)

## 5. Critical Conventions

- **Sealed entities with private setters** — all domain entities are `sealed`; every property is `public get, private set`; EF hydrates via reflection. Never add public setters.
- **Factory method + private constructor** — instantiate entities only through static `Create(...)` or `CreateDraft(...)`. The private parameterless constructor exists solely for EF. `Tranche.cs:30,76`
- **`Money` value object for all financial amounts** — pass `Money.NGN(decimal)` into ledger entry methods; never pass raw `decimal` to `AddDebit`/`AddCredit`. Stored as `decimal(18,2)` in the DB. `Money.cs:19`
- **Every money movement = one `LedgerTransaction` + balanced entries** — `Post()` enforces Σ debits = Σ credits at the domain level. `LedgerTransaction.cs:80–84`
- **Use cases own the transaction boundary** — a use case calls `SaveChangesAsync` after each logical unit; there is no Unit-of-Work wrapper. Do not call `SaveChangesAsync` inside domain entities or repositories mid-operation.
- **`DomainException` is the only thrown exception for business rule violations** — the `DomainExceptionFilter` converts it to HTTP 400. Never throw `ArgumentException` or `InvalidOperationException` for domain rules. `DomainExceptionFilter.cs:11`
- **All dates stored as UTC midnight** — `startDate.Date` strips time; `DateTime.SpecifyKind(..., Utc)` on `PostedAtUtc`. Never store local time. `LedgerTransaction.cs:87`, `Tranche.cs:69`
- **Sequence numbers are date-stamped** — format `SF-YYYYMMDD-000001`; backed by `LedgerDailySequence` and `TrancheDailySequence` tables. Do not generate codes in application code.
- **Migration baselining on startup** — `Program.cs:116–185` detects a pre-existing DB without EF history and baselines it. When adding migrations to an existing deployment, verify this path is not broken.
- **Controllers return anonymous shapes** — response DTOs are anonymous objects inside the controller action, not separate DTO classes. `TranchesController.cs:133–138`

## 6. Additional Documentation

- `.claude/docs/architectural_patterns.md` — Clean Architecture layers, Repository pattern, Use Case pattern, double-entry ledger, EF Fluent config, DomainException error boundary, and audit trail patterns with file:line references and extension guidance.
- `.claude/docs/mono_integration.md` — Mono Connect widget integration: correct setup/open lifecycle, backend proxy pattern, API endpoints, balance format (kobo), and production checklist.

## Adding New Features or Fixing Bugs

**IMPORTANT**: When you work on a new feature or bug, create a git branch first.
Then work on changes in that branch for the remainder of the session.
