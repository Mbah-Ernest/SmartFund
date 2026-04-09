# Loan Application Flow (Proposed)

## 1) First-time user onboarding
1. User signs up and sees their `User ID` on screen and in profile.
2. User submits an initial request with:
   - `User ID`
   - full name
3. Admin receives the request and manually enters:
   - full name
   - phone number
   - email address
   - emergency contact number (parent/guardian)
4. User is notified and can access the main loan page.

## 2) Loan access rules
- First-time users: max loan = `₦5,000`.
- To borrow above `₦5,000`, user must have **at least one active linked card**.
- User must input the **account number for the linked card**.
  - Display a notice: “This is the account where your loan will be paid into.”

## 3) Loan request form
User selects:
- Amount
- Duration options (examples):
  - `7 days`
  - `2 weeks`
  - `1 month`
  - `2 months`
- Repayment style:
  - `one-time payment`
  - `2 installments`
  - `3 installments`

The UI shows:
- interest amount
- total repayment
- repayment date(s)
- installment breakdown

## 4) Interest calculation
Daily interest uses a simple tiered rate:
- `₦20,000–₦50,000` → `0.9%` per day
- `₦50,000–₦100,000` → `0.9%` per day
- `above ₦100,000` → `0.88%` per day

Formula:
- `interest = principal × daily_rate × number_of_days`
- `total_due = principal + interest`

## 5) Review workflow (admin)
- Admin can move a loan through:
  - `Pending` → `UnderReview` → `Approved` / `Rejected` → `Disbursed`

## 6) Borrower view
After approval/disbursement, user can view:
- outstanding balance
- next due date
- repayment schedule
- payment history
