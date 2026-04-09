Working directory: C:\Users\User\Desktop\Tech-Ideas\Personal\SmartFund

Backend: C# / .NET

---

FEATURE REQUEST: Transaction Intelligence Layer

Add the following four interconnected features to SmartFund. 
Do not break any existing functionality.

---

FEATURE 1: SMALL CHARGES TRACKER

Problem: Small recurring charges (bank levies, airtime, data, 
transfer fees, SMS fees) are invisible individually but add up 
to significant amounts over time.

Backend tasks:
* Create a SmallCharge detection service that runs on every 
  transaction sync (Mono) and every bank statement upload
* Define a SmallChargeRule table in the database:
  * Keywords: ["levy", "sms", "vat", "stamp duty", "airtime", 
    "data", "maintenance fee", "card fee", "transfer charge"]
  * Amount threshold: transactions below ₦1,000 matching 
    keywords are flagged as small charges
* On each transaction, tag it with a is_small_charge boolean 
  and a small_charge_category (levy, airtime, data, fees, other)
* Add API endpoint: GET /api/insights/small-charges
  Returns:
  * Total small charges this month
  * Total small charges last month
  * Total small charges all time
  * Breakdown by category (levy, airtime, data, fees)
  * Monthly trend (last 6 months)
  * "You've spent ₦X on bank levies alone this year" type stats

Frontend tasks:
* Add a "Silent Drains" card on the Dashboard showing:
  * Total small charges this month (red/amber number)
  * Biggest category this month
  * Link to full breakdown
* Add a Small Charges tab or section inside 
  /finance/transactions showing the full breakdown table
  * Filter by: Levy / Airtime / Data / Fees / Other
  * Monthly summary bar at top
  * Each row: date · description · amount · category badge

---

FEATURE 2: AI-POWERED SPENDING INSIGHTS

Problem: Users need proactive, personalised insights from their 
transaction history — not just raw numbers.

Backend tasks:
* Create an InsightsService that uses Claude API (Haiku 4.5)
* Insight generation should be triggered:
  * On demand (user opens AI insights panel)
  * After every bank sync
  * After every bank statement upload
* Build a context builder that prepares a financial summary 
  for the AI:
  * Last 3 months of categorised transactions
  * Monthly income vs expense totals
  * Top 5 spending categories
  * Budget compliance status
  * Small charges total
  * Any unusual spikes detected
* Prompt Claude Haiku to return structured JSON insights:
  {
    "insights": [
      {
        "type": "warning|tip|observation|achievement",
        "title": "Short headline",
        "body": "2-3 sentence explanation with actual ₦ figures",
        "action": "optional CTA text",
        "priority": 1-5
      }
    ]
  }
* Example insights to guide the prompt:
  * "You spent ₦143k on airtime and data in 12 months — 
     that's ₦11,900/month average"
  * "Your food spending spiked 40% in October vs September"
  * "You've been net negative 4 out of the last 6 months"
  * "Bank levies cost you ₦8,400 this year silently"
  * "Your income this month is your highest in 6 months"
* Store generated insights in an Insights table with a 
  generated_at timestamp (avoid regenerating too frequently 
  — cache for 6 hours minimum)
* Add API endpoint: GET /api/insights/ai
  Returns latest insights array, sorted by priority

Frontend tasks:
* Upgrade the existing AI Insights panel on the Dashboard:
  * Each insight rendered as a card with:
    - Icon based on type (⚠️ warning, 💡 tip, 📊 observation, 
      🏆 achievement)
    - Title + body text
    - Optional action button
    - Color-coded left border by type
  * "Refresh insights" button (triggers new generation)
  * "Last updated X minutes ago" timestamp
  * Loading skeleton while generating

---

FEATURE 3: BANK STATEMENT UPLOAD + ANALYSIS

Problem: Not all users will connect via Mono immediately. 
They should be able to upload a PDF or CSV bank statement 
and get the same intelligence.

Backend tasks:
* Create a StatementUpload endpoint: 
  POST /api/bank/statement/upload
  * Accepts: PDF or CSV file
  * Max size: 10MB
  
* PDF parsing:
  * Use a .NET PDF library (PdfPig or iTextSharp) to extract 
    text from the statement
  * Send extracted text to Claude Haiku with this instruction:
    "Parse this Nigerian bank statement text and return a JSON 
    array of transactions. Each transaction must have: date 
    (ISO format), description, debit (null if credit), 
    credit (null if debit), balance, channel. Return ONLY 
    valid JSON, no explanation."
  * Handle parsing failures gracefully — flag uncertain 
    transactions for manual review

* CSV parsing:
  * Auto-detect column headers (date, description, debit, 
    credit, balance are common Nigerian bank CSV formats)
  * Map columns to standard transaction schema

* After parsing:
  * Run SmallCharge detection on all parsed transactions
  * Run AI categorization on each transaction (use existing 
    bank rules first, then Claude for unknowns)
  * Flag low-confidence categorizations for manual review 
    in Bank Inbox
  * Store all parsed transactions in BankInboxTransaction 
    table with source = "statement_upload"
  * Trigger InsightsService to regenerate insights

* Add API endpoints:
  * POST /api/bank/statement/upload → returns upload job ID
  * GET /api/bank/statement/upload/{id}/status → 
    returns processing status + stats when complete
    {
      "status": "processing|complete|failed",
      "total": 245,
      "parsed": 245,
      "flagged_for_review": 12,
      "small_charges_found": 47,
      "date_range": "Jan 2025 - Mar 2026"
    }

Frontend tasks:
* Add a "Upload Statement" button on /finance/bank page 
  alongside the Mono connect option
* Upload flow:
  * Step 1: Drag-and-drop or file picker (PDF or CSV)
  * Step 2: Processing screen with progress indicator and 
    status messages:
    - "Reading your statement..."
    - "Categorising transactions..."
    - "Detecting silent drains..."
    - "Generating insights..."
  * Step 3: Complete screen showing summary stats:
    - Total transactions imported
    - Date range covered
    - Small charges found
    - Transactions needing review (link to Bank Inbox)
    - "View Insights" button

---

FEATURE 4: RECURRING PATTERN DETECTION

Problem: Users don't realise they have recurring charges, 
subscriptions, or income patterns. Surfacing these creates 
awareness.

Backend tasks:
* Create a RecurringPatternService that runs weekly 
  (or after any large import)
* Detection logic:
  * Group transactions by similar description 
    (fuzzy match — same merchant/sender, ±20% amount)
  * Flag as recurring if it appears at least 3 times with 
    roughly consistent intervals (weekly, monthly, etc.)
  * Classify as:
    - Recurring expense (subscription, loan repayment, 
      utility, airtime auto-purchase)
    - Recurring income (salary, allowance, freelance client)
    - Irregular but frequent (loan app borrowing pattern)
* Store detected patterns in a RecurringPattern table:
  * description, average_amount, frequency 
    (weekly/monthly/irregular), category, type 
    (income/expense), first_seen, last_seen, occurrence_count
* Add API endpoint: GET /api/insights/recurring
  Returns all detected patterns sorted by total impact 
  (occurrence_count × average_amount)

Frontend tasks:
* Add a "Recurring Patterns" section on Dashboard or as 
  a sub-page of Transactions:
  * Two tabs: Expenses | Income
  * Each pattern card:
    - Merchant/description name
    - Average amount
    - Frequency badge (Weekly / Monthly / Irregular)
    - Total spent/received (all time)
    - First seen → Last seen
    - Category badge
  * Special callout for loan app patterns:
    - "You've borrowed from EaseMoni 10 times — 
       total ₦200,000 borrowed"
  * Special callout for pass-through patterns:
    - "₦X arrives and leaves your account same day 
       across Y transactions — is this collected funds?"

---

IMPLEMENTATION ORDER
1. Database migrations first (new tables/columns)
2. SmallCharge detection service
3. Statement upload + parsing (PDF + CSV)
4. Recurring pattern detection
5. AI insights service (depends on 2, 3, 4 being ready)
6. All API endpoints
7. Frontend — Dashboard upgrades
8. Frontend — Statement upload flow
9. Frontend — Small charges view
10. Frontend — Recurring patterns view

---

CONSTRAINTS
* Cache AI insights for minimum 6 hours to control API costs
* All monetary values in Naira (₦), stored as decimal in DB
* Do not modify existing transaction, budget, or loan logic
* All new endpoints must use the existing JWT auth middleware
* Start in Plan Mode — map out all new tables, services, 
  and endpoints before writing any code