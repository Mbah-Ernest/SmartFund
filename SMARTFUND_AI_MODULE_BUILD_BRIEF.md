# Smartfund AI stock intelligence module — build brief

**Audience:** This document is written for a `claude code --dangerously-skip-permissions` agent that will build the module end-to-end. The human owner will perform a small number of out-of-band tasks (signing up for accounts, installing apps, providing API keys). Both task lists are explicit below.

**Project type:** Add a new module to an existing Next.js + C# .NET + PostgreSQL application called Smartfund. Auth and dashboard layout already exist; do not modify them.

**Stack already in place:**
- Frontend: Next.js (React)
- Backend: C# .NET (Web API)
- Database: PostgreSQL
- Existing: user authentication, dashboard layout

---

## 1. What we are building

A "decision-support" module for Nigerian Stock Exchange (NGX) stocks. The user manually enters end-of-day OHLCV prices for stocks they hold or watch (NGX is end-of-day, so this is acceptable). The system:

1. Stores those prices in PostgreSQL.
2. Computes technical indicators (RSI, SMA, EMA, MACD) in C#.
3. Calls the Claude API to generate a plain-English decision-support brief that summarises the technical signals, news sentiment, and fundamentals.
4. Renders a stock detail page in Next.js with three panels:
   - **Left:** Embedded TradingView chart (free widget) for visual analysis and drawing.
   - **Middle:** Manual price entry form + history table.
   - **Right:** AI decision-support brief panel.
5. Adds a watchlist card to the existing dashboard summarising all tracked tickers with signal badges.

**Critical constraint:** The AI must NEVER output direct buy/sell instructions. It produces *decision-support* text only — describing what the signals show, with conflicting signals flagged. Any prompt sent to Claude must enforce this in its system instructions.

---

## 2. What the human will do (out of band)

The agent should pause and request these from the human before they are needed. Do not attempt to do them programmatically.

### 2.1. Accounts & keys to obtain
| What | Where | Why | When needed |
|---|---|---|---|
| Anthropic API key | console.anthropic.com → API keys | Claude API calls for the AI brief | Before Phase 3 |
| TradingView account (free is fine) | tradingview.com | Optional — only needed if the human wants to save custom Pine Script indicators they author themselves | Anytime |

### 2.2. Apps to install (optional, for the human's personal use)
| App | Why | Install link |
|---|---|---|
| TradingView Desktop | Lets the human open the same NGX charts (NSENG:DANGCEM, NSENG:MTNN, etc.) in a desktop app and write Pine Script indicators for personal analysis. NOT required for Smartfund itself — Smartfund embeds TradingView's free widget directly. | tradingview.com/desktop |

### 2.3. Information the agent should ask for at kickoff
1. **Database connection string** for the existing PostgreSQL instance.
2. **Project root paths** for both the .NET backend and the Next.js frontend.
3. **Existing C# project name and namespace** (so new files match the convention).
4. **Existing Next.js routing convention** — App Router or Pages Router.
5. **Initial list of NGX tickers** the human wants pre-seeded (e.g. DANGCEM, MTNN, ZENITHBANK, GTCO, AIRTELAFRI). Tickers must match TradingView's NSENG: format exactly.

---

## 3. What the agent will build

Build in this order. Do not skip phases. After each phase, run a smoke test and report status to the human before proceeding.

### Phase 1 — PostgreSQL schema

Add four new tables to the existing database. Do not touch existing auth tables.

**Tables:**

- `stocks` — one row per NGX ticker.
  - `ticker` (PK, varchar) — e.g. "DANGCEM"
  - `tradingview_symbol` (varchar) — e.g. "NSENG:DANGCEM"
  - `company_name` (varchar)
  - `sector` (varchar, nullable)
  - `created_at` (timestamptz)

- `price_entries` — one row per ticker per trading day.
  - `id` (PK, bigserial)
  - `ticker` (FK → stocks.ticker)
  - `trade_date` (date)
  - `open`, `high`, `low`, `close` (numeric)
  - `volume` (bigint)
  - `created_at`, `updated_at` (timestamptz)
  - Unique constraint on (ticker, trade_date).

- `ai_briefs` — cached AI output per ticker, regenerated on each new price entry.
  - `id` (PK, bigserial)
  - `ticker` (FK → stocks.ticker)
  - `generated_at` (timestamptz)
  - `rsi_value` (numeric, nullable)
  - `rsi_signal` (varchar) — "Oversold" | "Neutral" | "Overbought"
  - `macd_signal` (varchar)
  - `price_vs_sma20` (varchar)
  - `price_vs_sma50` (varchar)
  - `news_sentiment` (varchar, nullable) — "Positive" | "Neutral" | "Negative"
  - `brief_text` (text) — the Claude-generated paragraph
  - Index on ticker + generated_at desc.

- `watchlist` — links a user to a ticker.
  - `id` (PK, bigserial)
  - `user_id` (FK → existing users table)
  - `ticker` (FK → stocks.ticker)
  - `holdings_qty` (numeric, nullable) — for portfolio P&L calculations
  - `avg_cost` (numeric, nullable)
  - `created_at` (timestamptz)
  - Unique constraint on (user_id, ticker).

Deliver as an EF Core migration in the existing C# project. Run the migration. Verify tables exist with `\dt` in psql.

**Smoke test:** Insert one row in `stocks` (DANGCEM, NSENG:DANGCEM) manually via psql. Confirm.

---

### Phase 2 — C# .NET API

Add three new controllers and supporting services. Use the existing project's namespace and conventions.

**Models / DTOs:**
- `StockCandle` — internal value type for indicator math (date, OHLCV).
- `TechnicalSummary` — output of indicator service (RSI, SMA20/50 status, MACD signal).
- `PriceEntryDto`, `BriefDto`, `StockHistoryDto` — request/response shapes.

**Services:**

- `IPriceRepository` / `PriceRepository` — EF Core CRUD for `price_entries`.
- `IBriefRepository` / `BriefRepository` — EF Core CRUD for `ai_briefs`.
- `TechnicalIndicatorService` — pure C# math, no external deps. Implements:
  - `SMA(closes, period)`
  - `EMA(closes, period)`
  - `RSI(closes, period=14)` using Wilder's smoothing
  - `MACD(closes, 12, 26, 9)`
  - `Analyse(candles) → TechnicalSummary` — high-level wrapper that returns the latest values and human-readable signal strings ("Oversold", "Bullish crossover", etc.).

**Controllers:**

- `PricesController`
  - `POST /api/prices` — body: `{ticker, date, open, high, low, close, volume}`. Inserts or updates the `price_entries` row. Then enqueues an AI brief regeneration job (see Phase 3).
  - `POST /api/prices/bulk` — accepts a CSV upload for backfill.
  - `DELETE /api/prices/{id}` — remove a bad entry.

- `StocksController`
  - `GET /api/stocks` — list all stocks in the system.
  - `GET /api/stocks/{ticker}/history?days=60` — returns recent price entries.
  - `GET /api/stocks/{ticker}/brief` — returns the latest AI brief (from `ai_briefs`, never calls Claude here — Phase 3 owns generation).

- `WatchlistController`
  - `GET /api/watchlist` — current user's tickers with holdings + latest brief signal badges.
  - `POST /api/watchlist` — add ticker.
  - `DELETE /api/watchlist/{ticker}` — remove.
  - `PATCH /api/watchlist/{ticker}` — update holdings_qty / avg_cost.

**Smoke test for Phase 2:**
1. POST a price entry for DANGCEM with sample OHLCV.
2. GET `/api/stocks/DANGCEM/history` — verify the entry comes back.
3. Unit test `TechnicalIndicatorService.RSI()` against a known input/output pair (use any published RSI calculator to verify).

---

### Phase 3 — AI orchestrator (C#)

A new service `AiBriefOrchestrator` that runs after every successful price save. Wire it in via either:
- A direct synchronous call from `PricesController.POST` (simpler), or
- A background queue using `IHostedService` with `Channel<T>` (cleaner; preferred if the project already uses background services).

**Flow inside `AiBriefOrchestrator.GenerateBriefAsync(string ticker)`:**

1. Load last 60 trading days of `price_entries` for the ticker.
2. Run `TechnicalIndicatorService.Analyse()` to get the `TechnicalSummary`.
3. (Optional, Phase 3.5) Load any cached news headlines for the ticker. For now, stub this as an empty list — real news scraping is a later enhancement.
4. Build the Claude prompt (template below).
5. Call the Anthropic API using the `Anthropic.SDK` NuGet package (or raw HttpClient if the SDK is not preferred).
6. Parse the response. Save a new row in `ai_briefs` with the structured signals plus the full `brief_text`.

**Anthropic API call requirements:**
- Use model `claude-opus-4-7` for highest quality, or `claude-sonnet-4-6` for cheaper runs (configurable).
- `max_tokens`: 600.
- API key read from environment variable `ANTHROPIC_API_KEY` — never hardcoded, never committed.
- Use a System prompt enforcing the decision-support-only constraint.

**System prompt (verbatim):**

```
You are a decision-support assistant analysing stocks on the Nigerian Stock Exchange.
You produce concise, factual briefs based on technical indicators and news headlines provided to you.
You NEVER tell the user to buy or sell. You describe what the signals show and explicitly flag any conflicting signals.
You respect that the user is making their own decision and that markets are uncertain.
Keep briefs to 3-4 sentences. Use plain English. State the technical posture, the news sentiment if available, and any conflicts.
```

**User prompt template (filled in by C#):**

```
Stock: {ticker} ({company_name})
Latest close: ₦{latest_close} on {latest_date}

Technical indicators (last 60 trading days):
- RSI(14): {rsi_value} → {rsi_signal}
- Price vs SMA20: {price_vs_sma20}
- Price vs SMA50: {price_vs_sma50}
- MACD: {macd_signal} (histogram: {macd_histogram})

Recent news headlines:
{news_bullets_or_"None available"}

Write the decision-support brief.
```

**Smoke test for Phase 3:**
1. Insert 60 days of synthetic price data for DANGCEM.
2. Trigger the orchestrator manually via a debug endpoint or directly in code.
3. Confirm a new row appears in `ai_briefs` with `brief_text` populated.
4. Read the brief — it must NOT contain the phrases "you should buy", "you should sell", "buy now", "sell now".

---

### Phase 4 — Next.js frontend: `/stocks/[ticker]` page

Add a new route to the existing Next.js app. Match the existing routing convention (App Router or Pages Router — confirm with the human at kickoff).

**Page layout** (responsive — stack on mobile, three columns on desktop ≥1280px):

```
┌──────────────────────────────────────────────────────────┐
│  Header: ticker, company name, latest close, daily Δ%    │
├──────────────────┬─────────────────┬─────────────────────┤
│                  │ Manual entry    │ AI decision brief   │
│  TradingView     │ form            │                     │
│  embed           │                 │ Signal badges       │
│  (~600px tall)   │ Date | O H L C  │ • RSI: ...          │
│                  │ Save & Analyse  │ • MACD: ...         │
│                  │                 │ • SMA20: ...        │
│                  │ ── history ──   │                     │
│                  │ table of last   │ Brief text          │
│                  │ 30 entries      │ (3-4 sentences)     │
│                  │ edit / delete   │                     │
│                  │                 │ Last updated: ...   │
└──────────────────┴─────────────────┴─────────────────────┘
```

**Components to create:**

- `<TradingViewChart symbol="NSENG:DANGCEM" />`
  - Loads `https://s3.tradingview.com/tv.js` once.
  - Initialises the widget with daily interval, RSI + MACD studies pre-loaded, drawing tools enabled, light/dark theme matched to the app.
  - The widget is free; no API key needed.
  - Re-init on `symbol` prop change.

- `<ManualPriceEntry ticker={ticker} onSaved={refresh} />`
  - Controlled inputs for date, open, high, low, close, volume.
  - Defaults date to today.
  - Validates: high ≥ low, close between low and high, all numeric, volume non-negative.
  - On submit: POST `/api/prices` → on success, calls `onSaved()` to trigger a refetch of history and brief.
  - Below the form: a `<PriceHistoryTable />` showing last 30 entries with edit/delete buttons.

- `<PriceHistoryTable entries={...} onEdit={...} onDelete={...} />`
  - Table with date, OHLCV, actions.
  - Inline edit on row click.

- `<BulkImportButton ticker={ticker} />`
  - Accepts a CSV with columns `date,open,high,low,close,volume`.
  - POSTs to `/api/prices/bulk`.
  - Shows progress and result toast.

- `<AiBriefPanel ticker={ticker} />`
  - Fetches `/api/stocks/{ticker}/brief`.
  - Renders signal badges with semantic colours: RSI (red/amber/green), MACD (red/green), SMA crossings (red/green).
  - Renders the `brief_text` body.
  - Shows "Last updated X minutes ago".
  - Has a "Regenerate" button that POSTs to a debug endpoint to force re-run (useful while developing).
  - Polls the endpoint every 30s for 2 minutes after a price save (to pick up the freshly-generated brief without manual refresh).

**Data fetching:**
- Use the existing app's data-fetching pattern (TanStack Query, SWR, or whatever is already in place — match it, do not introduce a new library).
- Auth headers must use the existing auth context.

**Smoke test for Phase 4:**
1. Navigate to `/stocks/DANGCEM`.
2. TradingView chart renders with NSENG:DANGCEM and indicators visible.
3. Submit a manual price entry — it appears in the history table.
4. Within ~30s, the AI brief panel updates with the new analysis.

---

### Phase 5 — Watchlist card on existing dashboard

Add a new card component to the existing dashboard page. Do not redesign the dashboard — just add one card.

**`<WatchlistCard />`:**
- Fetches `/api/watchlist`.
- Renders a compact table: ticker, last close, daily Δ%, RSI badge, MACD badge, holdings qty, P&L (computed from avg_cost vs latest close).
- Each row links to `/stocks/{ticker}`.
- Has an "Add ticker" button that opens a modal with a ticker autocomplete (queries `/api/stocks`).

**Smoke test for Phase 5:**
1. Add DANGCEM to the watchlist.
2. The card on the dashboard shows it with current signal badges.
3. Click the row — navigates to the detail page.

---

## 4. Project structure conventions

Place new files alongside existing ones. Suggested layout:

**C# backend:**
```
{ExistingProject}/
├── Controllers/
│   ├── PricesController.cs
│   ├── StocksController.cs
│   └── WatchlistController.cs
├── Services/
│   ├── TechnicalIndicatorService.cs
│   └── AiBriefOrchestrator.cs
├── Models/
│   ├── Stock.cs
│   ├── PriceEntry.cs
│   ├── AiBrief.cs
│   └── WatchlistEntry.cs
├── Data/
│   └── Repositories/
│       ├── PriceRepository.cs
│       └── BriefRepository.cs
└── Migrations/
    └── {timestamp}_AddStockModule.cs
```

**Next.js frontend:**
```
app/  (or pages/ — match existing)
└── stocks/
    └── [ticker]/
        └── page.tsx
components/
└── stocks/
    ├── TradingViewChart.tsx
    ├── ManualPriceEntry.tsx
    ├── PriceHistoryTable.tsx
    ├── BulkImportButton.tsx
    ├── AiBriefPanel.tsx
    └── WatchlistCard.tsx
lib/
└── api/
    └── stocks.ts   (typed API client functions)
```

---

## 5. Configuration & secrets

Add to the existing config system. Do not commit secrets.

**Backend (appsettings.json + env vars):**
- `ANTHROPIC_API_KEY` — env var only, never in appsettings.
- `Anthropic:Model` — default `"claude-opus-4-7"`, configurable to `"claude-sonnet-4-6"` for cost.
- `Anthropic:MaxTokens` — default `600`.

**Frontend (.env.local):**
- `NEXT_PUBLIC_API_BASE_URL` — points at the C# backend.

Verify `.env.local` and any `appsettings.Development.json` containing keys are in `.gitignore`.

---

## 6. Quality checklist before reporting done

The agent must verify each item before declaring the build complete:

- [ ] All 4 tables created in PostgreSQL with correct constraints.
- [ ] EF Core migration applies cleanly on a fresh database.
- [ ] All 3 controllers respond to all listed routes.
- [ ] `TechnicalIndicatorService` has at least one unit test per indicator (RSI, SMA, EMA, MACD) verified against a known reference value.
- [ ] AI brief generation produces text that does NOT contain "buy now", "sell now", "you should buy", or "you should sell" (write a regex assertion in a test).
- [ ] `ANTHROPIC_API_KEY` is read from environment variable, not hardcoded, and not committed.
- [ ] TradingView chart renders for `NSENG:DANGCEM` in the browser.
- [ ] Manual price entry → save → AI brief refresh works end-to-end with no manual page reload.
- [ ] Watchlist card displays on the existing dashboard without breaking the existing layout.
- [ ] Mobile layout (≤768px) stacks the three panels vertically and remains usable.
- [ ] No new lint errors in either project.
- [ ] README updated with: how to set ANTHROPIC_API_KEY, how to run the migration, how to seed initial stocks.

---

## 7. Out of scope (do NOT build in this pass)

- Real-time price feeds. Manual entry is the design.
- News scraping. The orchestrator stubs news as empty for now.
- Mobile app. Web only.
- Buy/sell automation or any broker integration.
- Currency conversion. Everything is in NGN.
- Multi-currency portfolio. NGX only.
- Any feature involving a real money transaction.

These can become future phases after the human validates the core experience.

---

## 8. How the agent should behave during the build

- **Pause and ask** at the start of each phase if any of the kickoff information from §2.3 is missing.
- **Pause and ask** before writing any file that would overwrite an existing file in the project — confirm with the human first.
- **Run the smoke test at the end of each phase** and report the result before moving on.
- **Never invent ticker data**. If real data isn't available, generate clearly-labelled synthetic data for testing and tell the human it is synthetic.
- **Never commit secrets**. If the agent finds a key inadvertently committed during the build, stop and tell the human immediately.
- **Match existing code style**. Read 2-3 existing controllers and components before writing new ones, and follow the same patterns (naming, error handling, response shapes).

---

## 9. Done definition

The build is done when:
1. A user logged into Smartfund can navigate to `/stocks/DANGCEM`, see a TradingView chart, manually enter a price, and within 30 seconds see an AI-generated decision-support brief on the same page.
2. The dashboard shows a watchlist card with their tracked tickers and current signal badges.
3. The quality checklist in §6 is fully ticked.

Hand back to the human with: a list of what was built, the smoke test results, the URL of the new page, and any follow-ups (e.g. "you should run the migration on staging next").
