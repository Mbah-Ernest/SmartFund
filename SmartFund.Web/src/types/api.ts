export type EntityId = number;

export interface LoginRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  userId: number;
  email: string;
  fullName: string;
  role: string;
}

export interface LoanApplicationDto {
  id: EntityId;
  userId: EntityId;
  amount: number;
  purposeCategory: string;
  purposeDescription: string;
  durationDays: number;
  repaymentInstallments: number;
  accountNumber: string;
  bankName: string;
  accountName: string;
  dailyInterestRate: number;
  interestAmount: number;
  totalRepayable: number;
  installmentAmount: number;
  status: string;
  submittedAtUtc: string;
  reviewedAtUtc?: string | null;
  reviewedByUserId?: EntityId | null;
  adminNote?: string | null;
}

export interface SubmitLoanRequest {
  amount: number;
  durationDays: number;
  repaymentInstallments: number;
  accountNumber: string;
  bankName?: string;
  accountName?: string;
  purposeCategory?: string;
  purposeDescription?: string;
}

export interface ReviewLoanRequest {
  adminNote?: string;
}

export interface LoanApplicantProfileDto {
  id: EntityId;
  userId: EntityId;
  submittedName: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  emailAddress?: string | null;
  emergencyContactNumber?: string | null;
  status: string;
  submittedAtUtc: string;
  reviewedAtUtc?: string | null;
  adminNote?: string | null;
}

export interface SubmitLoanApplicantRequest {
  fullName: string;
}

export interface VerifyLoanApplicantRequest {
  fullName: string;
  phoneNumber: string;
  emailAddress: string;
  emergencyContactNumber: string;
  adminNote?: string;
}

export interface RejectLoanApplicantRequest {
  adminNote?: string;
}

export interface UserSummaryDto {
  id: EntityId;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAtUtc: string;
}

export interface UserCreditInsightsDto {
  userId: EntityId;
  fullName: string;
  email: string;
  tenureDays: number;
  avgMonthlyIncome: number;
  avgMonthlyExpenses: number;
  incomeToExpenseRatio: number;
  bankAccountCount: number;
  budgetComplianceRate: number;
  goalOnTrackRate: number;
  incomeStabilityScore: number;
  avgMonthlyTransactionCount: number;
  loanCount: number;
  mostRecentLoanStatus?: string | null;
}

export interface InvestorDto {
  id: EntityId;
  fullName: string;
  email: string;
  phone?: string | null;
  status: number;
  createdAtUtc: string;
}

export interface CreateInvestorRequest {
  fullName: string;
  email: string;
  phone?: string | null;
}

export interface DealDto {
  id: EntityId;
  dealCode: string;
  title: string;
  borrowerName: string;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
  status: number;
  createdAtUtc: string;
}

export interface TrancheDto {
  id: EntityId;
  trancheCode: string;
  dealId?: EntityId | null;
  investorId: EntityId;
  principal: number;
  status: string;
}

export interface CreateDealRequest {
  dealCode: string;
  title: string;
  borrowerName: string;
  loanAmount: number;
  interestRate: number;
  tenureMonths: number;
}

export interface CreateDealResponse {
  dealId: EntityId;
}

export interface CreateTrancheRequest {
  investorId: EntityId;
  dealId?: EntityId | null;
  principal: number;
  roiType: number;
  roiRate: number;
  startDate: string;
  maturityDate: string;
  payoutType: number;
  noticeDays?: number | null;
  earlyWithdrawalPolicy: number;
}

export interface CreateTrancheResponse {
  trancheId: EntityId;
  trancheCode: string;
  liabilityAccountId: EntityId;
}

export interface FundTrancheRequest {
  amount: number;
  bankAccountId: EntityId;
}

export interface PayoutTrancheRequest {
  amount: number;
  bankAccountId: EntityId;
}

export interface SignTrancheAgreementRequest {
  signedName: string;
  documentUrl: string;
}

export interface FundOrUseResponse {
  transactionId: EntityId;
}

export interface InsuranceBufferReportDto {
  totalExposure: number;
  totalInsuranceReserve: number;
  coverageRatio: number;
}

export interface SignTrancheAgreementResponse {
  agreementId: EntityId;
  version: number;
}

export interface FundInsuranceRequest {
  walletType: number;
  dealId?: EntityId | null;
  amount: number;
  bankAccountId: EntityId;
  receivedByUserId: EntityId;
}

export interface UseInsuranceRequest {
  trancheId: EntityId;
  amount: number;
  usedByUserId: EntityId;
}

export interface LedgerEntryDraftRequest {
  accountId: EntityId;
  debit: number;
  credit: number;
}

export interface CreateLedgerTransactionRequest {
  narration: string;
  entries: LedgerEntryDraftRequest[];
}

export interface CreateLedgerTransactionResponse {
  id: EntityId;
  status: number;
  narration: string;
  entryCount: number;
}

export interface LedgerTransactionListItemDto {
  id: EntityId;
  status: number;
  narration: string;
  sequenceNumber?: string | null;
  postedAtUtc?: string | null;
}

export interface LedgerTransactionDto {
  id: EntityId;
  status: number;
  narration: string;
  sequenceNumber?: string | null;
  postedAtUtc?: string | null;
  postedByUserId?: EntityId | null;
  entries: Array<{
    accountId: EntityId;
    debit: number;
    credit: number;
  }>;
}

export interface PostLedgerTransactionRequest {
  postedByUserId: EntityId;
}

export interface PostLedgerTransactionResponse {
  transactionId: EntityId;
  sequenceNumber: string;
  status?: number | null;
  postedAtUtc?: string | null;
}

export interface LedgerAccountDto {
  id: EntityId;
  name: string;
  type: number;
  currency: string;
  referenceType: number;
  referenceId?: EntityId | null;
}

export interface CreateLedgerAccountRequest {
  name: string;
  type: number;
  referenceType?: number;
  referenceId?: EntityId | null;
}

export interface AuditEntryDto {
  id: EntityId;
  category: number;
  action: string;
  description: string;
  ledgerTransactionId?: EntityId | null;
  reversesAuditEntryId?: EntityId | null;
  reversedByAuditEntryId?: EntityId | null;
  createdAtUtc: string;
}

export interface ReverseAuditEntryRequest {
  pin: string;
}

export interface ReverseAuditEntryResponse {
  reversalAuditEntryId: EntityId;
}
