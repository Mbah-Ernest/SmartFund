# SmartFund

## General Rules

When implementing features from a spec/plan file, start coding immediately after a brief scan. Do NOT spend extensive time exploring the codebase. Limit exploration to 2-3 minutes max before writing code.

For complex or multi-step tasks, create a todo list using the TaskCreate tool at the start to track progress. Mark each task complete as it's finished — do not batch completions.

When running low on context during a long task, write a `CONTINUATION.md` file before stopping with: 1) what's been completed, 2) what files were changed, 3) what remains, 4) the exact next step to take. Include file paths and any gotchas discovered.

## Project Architecture

This project uses TypeScript (React/Vite frontend) and C#/.NET (ASP.NET backend with EF Core and SQL Server). Always check port configurations match between Vite proxy and backend API. MAUI Blazor is used for the Restaurant POS app (separate project).

## Build & Verification

Always run `dotnet build` after every set of changes to catch errors immediately. Never chain multiple file edits without a build check in between.

## Database & Migrations

Before editing EF Core migration files, ensure the API server is stopped to avoid DLL lock issues. Never use sed to edit migration files — use the Edit tool instead.

## Code Quality

When implementing stub/placeholder service classes, always ensure they implement their declared interfaces with all required methods before moving on.

## 1. Project Purpose

SmartFund is a Nigerian investment fund management platform for a fund operator (not a retail app). It tracks investor tranches inside deals, enforces double-entry bookkeeping on every cash movement, and records a full audit trail. A secondary personal-finance module lets individual users track wallets, budgets, and spending goals. The system is built for one fund operator running the backend locally or on-premise.

### Current focus (Personal Finance — Manual Entry + Ledger View)

The current development focus is on **manual transaction entry as the primary input method** (Mono bank sync is paused). Users record income/expense/transfer manually; bank sync is a secondary path for when Mono resumes.

- **Manual transaction entry** — primary input method
  - `QuickEntrySheet` (`SmartFund.Web/src/modules/personalFinance/components/QuickEntrySheet.tsx`) is the primary UI entry point. It stays open after each submission (batch-entry mode) and has a "Done" button to close.
  - Transactions are entered manually via `POST /api/personal-transactions/income|expense|transfer`.
  - `TransactionSource` enum (`SmartFund.Domain/PersonalFinance/Enums/TransactionSource.cs`) tracks provenance:
    - `Manual = 1` — user-entered via QuickEntrySheet
    - `BankSync = 2` — imported via Mono bank sync
    - `Reconciliation = 3` — created by the reconcile-wallet use case
  - `PersonalTransactionType.Adjustment = 4` is used exclusively by reconciliation entries.
  - Existing bank-imported transactions are backfilled to `Source = 2` via migration data fixup.
  - `PATCH /api/personal-transactions/{id}/description` allows editing only the description of a posted transaction (amount and date are immutable for double-entry integrity).

- **Opening balance + wallet reconciliation**
  - `PersonalWallet` carries `OpeningBalance` (decimal, default 0) and `OpeningBalanceDate` (nullable DateTime).
  - Effective wallet balance = `OpeningBalance + ledger posted balance`.
  - Running balance is computed **client-side** in `ledgerUtils.ts:computeRunningBalance` — it is never stored in the DB.
  - `PUT /api/personal-wallets/{id}/opening-balance` sets the opening balance.
  - `POST /api/personal-wallets/{id}/reconcile` computes drift (actual − current) and posts an Adjustment entry.
  - `ReconcileSheet` (`SmartFund.Web/src/modules/personalFinance/components/ReconcileSheet.tsx`) is the UI for reconciliation; lives in per-wallet tab headers.
  - `OpeningBalancePrompt` shows when `openingBalanceDate === null`, with distinct messaging for zero-transaction wallets ("anchor" message) vs wallets with existing transactions ("accurate running totals" message).

- **Mono bank sync** (paused — infrastructure exists, resuming later)
  - Config lives in `SmartFund.API/appsettings.json` under `Mono:*`.
  - `Mono:PublicKey` is used for Mono Connect; `Mono:SecretKey` is used for server-to-server calls via `mono-sec-key`.
  - Webhook receiver exists at `POST /api/webhooks/mono` (`SmartFund.API/Controllers/MonoWebhookController.cs`).
  - `Mono:SkipTlsVerification` is an escape hatch for dev-only TLS interception issues (only applied in Development via `Program.cs`).
  - Transactions query currently uses a `start`/`end` date range and expects `dd-MM-yyyy` formatting (per `MOMO.md`).

- **Planned Personal Finance architecture changes (next milestones)**
  - Treat each connected bank account as a wallet (1:1), and *compute* aggregate totals in UI (avoid a persisted “All Banks” wallet).
  - Persist provenance when posting from bank inbox → personal transactions (store source bank account / import ids).
  - Add per-user (or MVP global) Personal Finance settings: Launch Date controls initial backfill; include Reset to purge/import reset + resync.

- **AI assistant direction**
  - The assistant should support decision coaching (e.g., “Can I afford a ₦600k iPhone?”) by checking goals, priorities, average spending, income/expense trends, and cash runway.
  - It should work as a chat-first experience: user asks questions in a messaging interface and gets grounded answers based on SmartFund data.
  - Implementation principle: the LLM must not invent numbers; it should call trusted server-side “tools” (report queries over the DB) and only format/justify based on returned data.
  - Planned interfaces/channels:
    - Telegram (first-class chat UI)
    - WhatsApp (later) via inbound webhook → map phone to user → call assistant → reply via provider API
  - Planned tool-calling capabilities (server-authoritative actions):
    - Retrieve balances (wallet + connected bank accounts)
    - Summarize spend by category/time range (e.g., Food + Travel last month)
    - Plan/create budgets and track budget health
    - Suggest spending cuts with targeted ratios (what to reduce and by how much)
    - Initiate transfers (requires explicit user confirmation + audit trail)
  - Personal Finance Management scope:
    - Connect with users’ bank accounts (Mono)
    - Connect AI agent to Personal Finance data + goals/budgets
    - Connect agent to a chat interface (Telegram first) for insights + tool calls

## 2. Tech Stack

- **Backend:** C# / .NET 10 (`net10.0`), ASP.NET Core 10.0.2, nullable reference types enabled
- **ORM:** Entity Framework Core 10.0.3 with SQL Server provider
- **Database:** SQL Server LocalDB (`(localdb)\mssqllocaldb`) — database `SmartFundDb`
- **Auth:** JWT Bearer (HS256), configured in `appsettings.json` under `Jwt:*`
- **API docs:** Swashbuckle/Swagger at `/swagger` in development
- **Frontend:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS v4 (OKLCH design tokens), Recharts 2, React Router 6, Axios, shadcn-style Radix UI component library, next-themes (dark mode), sonner (toasts), lucide-react (icons)
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

## 6. Frontend Design System (SmartFund.Web)

### Component library
All UI primitives live in `SmartFund.Web/src/components/ui/` and are imported via the `@/` alias (maps to `./src`). Every component follows the shadcn/Radix pattern.

| File | Exports |
|------|---------|
| `button` | `Button`, `buttonVariants` |
| `card` | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` |
| `badge` | `Badge` |
| `input` | `Input` |
| `field` | `Field`, `FieldGroup`, `FieldLabel`, `FieldError`, `FieldDescription` |
| `label` | `Label` |
| `skeleton` | `Skeleton` |
| `separator` | `Separator` |
| `alert` | `Alert`, `AlertTitle`, `AlertDescription` |
| `alert-dialog` | `AlertDialog`, `AlertDialogTrigger`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel` |
| `dialog` | `Dialog`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose` |
| `table` | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell` |
| `tabs` | `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` |
| `select` | `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` |
| `textarea` | `Textarea` |
| `progress` | `Progress` |
| `switch` | `Switch` |
| `checkbox` | `Checkbox` |
| `tooltip` | `Tooltip`, `TooltipTrigger`, `TooltipContent` |
| `scroll-area` | `ScrollArea` |
| `collapsible` | `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` |
| `avatar` | `Avatar`, `AvatarImage`, `AvatarFallback` |
| `dropdown-menu` | `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator` |
| `popover` | `Popover`, `PopoverTrigger`, `PopoverContent` |
| `sheet` | `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription` |
| `spinner` | `Spinner` |
| `sonner` | `Toaster` — use `toast()` from `'sonner'` for all notifications |
| `sidebar` | Full collapsible sidebar primitives — see `app-sidebar.tsx` for usage |

### Utilities
- `@/lib/utils` → `cn()`, `formatNaira()`, `formatDate()`, `formatDateTime()`
- `@/hooks/use-mobile` → `useIsMobile()`

### Top-level components
- `@/components/theme-provider` → `ThemeProvider` (wraps `next-themes`, default dark)
- `@/components/theme-toggle` → `ThemeToggle` (sun/moon button)
- `@/components/smart-fund-logo` → `SmartFundLogo` (logo + wordmark)
- `@/components/app-sidebar` → `AppSidebar` (full nav sidebar with role-based sections, inbox badge)
- `@/components/ChatWidget` → floating AI chat button + panel

### Layout
`src/layouts/BaseLayout.tsx` uses `SidebarProvider → AppSidebar + SidebarInset`. Every authenticated page renders inside `<SidebarInset>` via `<Outlet />`. The header contains `SidebarTrigger` + `ThemeToggle`.

### Page structure convention
Every interior page must follow this pattern:
```tsx
<div className="flex flex-1 flex-col gap-4 p-4 pt-0">
  <div>
    <h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
    <p className="text-muted-foreground text-sm">Subtitle</p>
  </div>
  {/* content in Cards */}
</div>
```

### Design tokens
`src/index.css` defines OKLCH CSS variables for both light and dark themes (primary, secondary, muted, card, sidebar, success, warning, destructive, etc.) and a `.glass` utility class for frosted-glass cards. Tailwind CSS v4 is used via `@tailwindcss/postcss` (no `tailwind.config.js`).

### Auth pages
`LoginPage` and `RegisterPage` use the `glass` Card centered on a radial-gradient background — no sidebar.

## 7. Additional Documentation

- `.claude/docs/architectural_patterns.md` — Clean Architecture layers, Repository pattern, Use Case pattern, double-entry ledger, EF Fluent config, DomainException error boundary, and audit trail patterns with file:line references and extension guidance.
- `SmartFund.Web/src/index.css` — Full OKLCH design token definitions (CSS vars for all colors in light + dark).
- `SmartFund.Web/src/lib/utils.ts` — `cn`, `formatNaira`, `formatDate`, `formatDateTime`.

## Adding New Features or Fixing Bugs

**IMPORTANT**: When you work on a new feature or bug, create a git branch first.
Then work on changes in that branch for the remainder of the session.
