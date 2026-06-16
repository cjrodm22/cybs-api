export interface CreatePayerAuthSessionDTO {
  referenceId?: string;
  authenticationTransactionId?: string;
  brand?: string;
  cardType?: string;
  eci?: string;
  commerceIndicator?: string;
  cavv?: string;
  xid?: string;
  ucafAuthenticationData?: string;
  ucafCollectionIndicator?: string;
  directoryServerTransactionId?: string;
  status?: string;
  amount?: string | number;
  currency?: string;
  rawResponse?: unknown;
}

export type UpdatePayerAuthSessionByReferenceIdDTO =
  CreatePayerAuthSessionDTO & {
    referenceId: string;
  };

export type UpdatePayerAuthSessionByTransactionIdDTO =
  CreatePayerAuthSessionDTO & {
    authenticationTransactionId: string;
  };
