# Mono (MoMo) – Extracted integration notes (from provided screenshots)

> This is a consolidated, *paraphrased* extraction of the key items visible in the screenshots you shared (Mono docs pages). It focuses on actionable integration steps, endpoints, headers, and webhook events (“methods”).

## 1) Prerequisites

- Sign up on the Mono Dashboard.
- Create an app on the dashboard to generate **Public** and **Secret** keys.
- Update/enable the Mono Connect widget to obtain your **public key**.

---

## 2) Integration stages (as shown)

### Stage A — SDK implementation (front-end)
Purpose: Render Mono Connect widget for a user to link an institution/account.

**Option 1: Script include**
- Include the Connect SDK script (hosted by Mono Connect).
- Configure the Connect widget with your **public key**.
- Use the success callback to obtain the identifier(s) returned by the widget (the screenshots show an `id` being returned from the widget).

**Option 2: Install via npm/yarn**
- `npm install @mono.co/connect.js`
- `yarn add @mono.co/connect.js`
- Import:
  - `import Connect from '@mono.co/connect.js'`

**Important note shown in screenshots**
- A note indicates there may be cases where a “customer object” is not required for setup; treat `customer` as optional unless your dashboard/config requires it.

### Stage B — API implementation (back-end)
Purpose: Use Mono server-side API to access financial data after the user links an account.

---

## 3) Authentication / headers

### Secret key header (server-side)
Screenshots indicate requests include a Mono secret-key header (name varies by endpoint/docs versions).

Use the header name required by your Mono docs/dashboard; the screenshots show a pattern like:

- `mono-sec-key: <MONO_SECRET_KEY>`

### Common request headers
- `accept: application/json`
- `content-type: application/json`

### Response headers (rate limiting / tracing)
The Real-Time Data screenshot shows response headers that include rate-limit and request tracing information (exact names may vary by API version), e.g.:

- `x-request-id`
- `x-ratelimit-limit`
- `x-ratelimit-remaining`
- `x-ratelimit-reset`
- API version header (shown as a “mono api version” header)

---

## 4) Key “methods” (API calls / endpoints) referenced in screenshots

> Base URL shown: `https://api.withmono.com/v2`

### 4.1 Connect Link initiation (API-driven link)
The “Connect Link Integration Guide” screenshots show a flow where you first **initiate** a link and then complete linking in the widget.

**Method:** `POST /accounts/initiate`

**Purpose:** Create a link session (returns a URL/token used to complete linking via Mono Connect).

**Body parameters shown (high-level):**
- `scope` (required) — what data access you’re requesting.
- `redirect_url` (required) — where to redirect after the widget flow.
- `meta` (optional) — attach additional metadata.
- `customer` (optional) — customer details (only if required by your configuration).

**Example (shape only):**
```json
{
  "scope": "...",
  "redirect_url": "https://your-app/callback",
  "meta": { "...": "..." },
  "customer": { "...": "..." }
}
```

### 4.2 Authorization (exchange widget identifier for Account ID)
The “Authorization” screenshot states:

- Use an **auth endpoint** to request an **Account ID** after successful enrollment on the Mono Connect widget.
- Request body shown contains an `id` obtained from the widget.

**Method:** `POST /accounts/auth`

**Request body (as shown):**
```json
{ "id": "<ID_FROM_WIDGET>" }
```

**Response:** returns an object that includes the **Account ID** for subsequent requests.

**Notes shown**
- The authorization token/step is time-sensitive (a note indicates an expiry window on the order of minutes).
- The Account ID itself is described as not expiring unless the account is unlinked via the API.

### 4.3 Transactions
The “Transactions” screenshot describes:

- A transactions resource that represents money in/out of an account.
- Filtering options described:
  - Filter by date range.
  - Filter by narration/description.
  - Filter debit-only or credit-only.
- Pagination supported via query parameters (page + limit shown), and a `meta.next` link shown in responses.

**Method:** `GET /accounts/{accountId}/transactions`

**Response shape shown (simplified):**
```json
{
  "status": "successful",
  "message": "Transaction retrieved successfully",
  "timestamp": "...",
  "data": [
    {
      "id": "...",
      "narration": "...",
      "amount": 500,
      "type": "debit",
      "balance": 1500,
      "date": "...",
      "category": "..."
    }
  ],
  "meta": {
    "total": 0,
    "page": 1,
    "previous": null,
    "next": "https://api.withmono.com/v2/..."
  }
}
```

### 4.4 Real-Time Data (accounts sync + job status + webhooks)
The “Real-Time Data” screenshot describes a real-time sync model:

- A sync job is triggered to fetch the *most recent* financial data from a customer’s linked account.
- After linking, your app can call Mono endpoints; the user’s data becomes available as sync jobs complete.

**Endpoints shown (high-level):**
- Balance endpoint is listed under API endpoints.
- Transactions endpoint is listed under API endpoints.
- A “Real-time Job Status” endpoint is listed.

> Exact resource paths are not fully legible across the screenshots; use this section as a map and confirm exact URLs in the Mono API reference.

#### Webhook events shown
The screenshot lists webhook events (names shown in the UI), including:

- `job_update` webhook (sent while sync job is processing / completed)
- `sync_success` webhook (sent when sync completes successfully)
- `sync_failed` webhook (sent if sync fails)
- `account_updated` webhook (sent after an account update/sync)

**Behavior notes shown**
- The `mono_id` in webhook payloads refers to the financial institution account.
- There’s a note indicating you may need to call the “refresh” endpoint to re-sync if data is stale.

### 4.5 Reauth Link initiation
The “Reauth Link Initiation Guide” screenshot shows a flow to reauthenticate a linked account.

**Method:** `POST /accounts/{accountId}/reauthorize/initiate` *(endpoint name inferred from screenshot title; confirm exact path in API reference)*

**Purpose:** Generate a reauth URL to have a user re-consent/re-login when required.

**Follow-up steps shown**
- After reauth initiation, confirm data status and then proceed to fetch financial data (accounts/transactions/statements, etc.).

---

## 5) Practical integration checklist (minimal)

1. Frontend: Render Mono Connect widget using your **public key**.
2. Capture widget success payload (includes an identifier like `id`).
3. Backend: `POST /accounts/auth` with `{ "id": "..." }` to obtain `accountId`.
4. Backend: Call data endpoints for the linked account (e.g., transactions; balance).
5. Set up webhook receiver endpoints in your API to handle sync lifecycle events (`job_update`, `sync_success`, `sync_failed`, `account_updated`).
6. If user data access expires or needs renewed consent, initiate reauth to obtain a reauth URL.

---

## 6) Security notes

- Never expose `MONO_SECRET_KEY` to the browser.
- Keep widget public key in the frontend, secret key on the server.
- Validate webhook signatures (if Mono provides them in your dashboard/version).

**Also shown (recommended):**
- Avoid calling Mono APIs directly from the frontend; proxy through your backend.
