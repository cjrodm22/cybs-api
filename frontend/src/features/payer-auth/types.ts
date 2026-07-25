export type StepStatus = "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
export type StepId =
  | "setup"
  | "collection"
  | "enrollment"
  | "challenge"
  | "validation"
  | "payment";

export interface StepDefinition {
  id: StepId;
  number: string;
  title: string;
  eyebrow: string;
}

export interface StepState {
  status: StepStatus;
  message: string;
  response?: unknown;
  completedAt?: string;
}

export interface FormValues {
  amount: string;
  currency: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  cardType: string;
  returnUrl: string;
}

export interface FlowSummary {
  referenceId?: string;
  payerAuthSessionId?: string;
  authenticationTransactionId?: string;
  status?: string;
  eci?: string;
  commerceIndicator?: string;
  brand?: string;
  approvalCode?: string;
  messageResponse?: string;
  deniedReason?: string;
  cardLastFour?: string;
}

export interface RuntimeValues {
  setupAccessToken?: string;
  deviceDataCollectionUrl?: string;
  challengeAccessToken?: string;
  stepUpUrl?: string;
  challengeReturnUrl?: string;
  frictionlessCompleted?: boolean;
}
