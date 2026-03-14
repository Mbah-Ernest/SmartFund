# Mono Integration Guide

## Overview

SmartFund integrates with [Mono](https://withmono.com) to allow users to connect their Nigerian bank accounts for read-only data (balances, transactions). The current implementation is a **developer test page** at `/finance/bank-test`.

---

## Architecture

```
Browser (React)
  └── Mono Connect Widget (CDN: connect.withmono.com/connect.js)
        └── onSuccess({ code }) → calls our backend proxy
              └── SmartFund.API /api/mono-test/* (MonoTestController.cs)
                    └── Mono API (api.withmono.com) — server-to-server, no CORS
```

**Critical rule:** The browser CANNOT call Mono's API directly — CORS blocks it.
All Mono API calls (exchange token, account details, transactions) must go through the backend.

---

## Frontend Widget Integration

### Script Loading
```
CDN: https://connect.withmono.com/connect.js
Exposes: window.Connect
```

### Correct Initialization Pattern
```typescript
// 1. Create instance with required customer object
const instance = new window.Connect({
  key: 'YOUR_PUBLIC_KEY',
  data: {
    customer: {
      name: 'Customer Name',   // required
      email: 'email@example.com', // required
      id: 'existing_customer_id', // optional — if already linked before
    }
  },
  onSuccess: (data: { code: string }) => { /* exchange data.code */ },
  onClose: () => { /* widget closed */ },
});

// 2. Call setup() FIRST — attaches iframe to DOM
instance.setup();

// 3. Call open() to show the widget (can be called later on button click)
instance.open();
```

**IMPORTANT:** `setup()` must be called before `open()`. Calling `open()` without `setup()` causes
`TypeError: Cannot read properties of null (reading 'style')` because the widget's iframe hasn't
been injected into the DOM yet.

### React Lifecycle Pattern
Store the instance in a `useRef` so `setup()` is called once and `open()` is called on click:

```typescript
const connectRef = useRef<{ setup: () => void; open: () => void } | null>(null);

// On script load (useEffect):
const instance = new window.Connect({ ... });
instance.setup();
connectRef.current = instance;

// On button click — re-init each time to pick up fresh config:
initConnect();
connectRef.current?.open();
```

---

## Backend Proxy (MonoTestController.cs)

Located at: `SmartFund.API/Controllers/MonoTestController.cs`
Base route: `api/mono-test`
Auth: JWT required (`[Authorize]`)

The secret key is passed from the frontend as the `X-Mono-Secret-Key` header.
This is acceptable for the test page (test keys only, JWT-protected endpoint).
**In production**, store the secret key in `appsettings.json` or environment variables server-side.

### Endpoints

| Method | Route | Mono API proxied |
|--------|-------|-----------------|
| `POST` | `/api/mono-test/exchange` | `POST https://api.withmono.com/v2/accounts/auth` |
| `GET`  | `/api/mono-test/accounts/{id}` | `GET https://api.withmono.com/v1/accounts/{id}` |
| `GET`  | `/api/mono-test/accounts/{id}/transactions` | `GET https://api.withmono.com/v1/accounts/{id}/transactions` |

### Exchange Token Request/Response
```
POST /api/mono-test/exchange
Headers: X-Mono-Secret-Key: test_sk_...
Body: { "code": "<auth_code_from_widget>" }

Response: { "id": "<permanent_account_id>" }
```

The account ID returned is **permanent** — save it to the database for future API calls.

---

## Mono API Reference

| Mono Endpoint | Description |
|--------------|-------------|
| `POST /v2/accounts/auth` | Exchange temporary code → permanent account ID |
| `GET /v1/accounts/{id}` | Account details (name, number, balance, institution) |
| `GET /v1/accounts/{id}/transactions` | Transaction history |

### Test Credentials (Mono sandbox)
- Widget login: username `testmono`, password `pass`
- Get test keys from: https://app.withmono.com/apps (sandbox mode)
- Key prefixes: `test_pk_...` (public), `test_sk_...` (secret)

### Balance Format
Mono returns balances in **kobo** (1 NGN = 100 kobo).
Divide by 100 before displaying: `formatCurrency(amountKobo / 100)`.

---

## Configuration (Test Page)
Keys are stored in `sessionStorage` (cleared on tab close):
- `mono_test_pk` — public key
- `mono_test_sk` — secret key
- `mono_customer_name` — customer name (required by widget)
- `mono_customer_email` — customer email (required by widget)

---

## Production Checklist
- [ ] Move secret key to server-side config (`appsettings.json` / environment variable)
- [ ] Remove `X-Mono-Secret-Key` header pattern; read key from config in controller
- [ ] Save permanent account IDs to the database linked to users
- [ ] Set up webhook URL in Mono dashboard to receive `mono.events.account_connected` events
- [ ] Replace test keys (`test_pk_`, `test_sk_`) with live keys
- [ ] Add `IHttpClientFactory` named client with base address and default headers for Mono
