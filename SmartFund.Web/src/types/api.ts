export type EntityId = number;

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  expiresAtUtc: string;
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
