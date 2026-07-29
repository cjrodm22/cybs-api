export type PaymentBrand = "VISA" | "MASTERCARD" | "AMERICAN EXPRESS";

type Base3DSPaymentAuthDTO = {
  brand: PaymentBrand;
  directoryServerTransactionId: string;
  paSpecificationVersion?: string;
};

export type Visa3DSPaymentAuthDTO = Base3DSPaymentAuthDTO & {
  brand: "VISA";
  commerceIndicator: "vbv";
  cavv: string;
  xid: string;

  ucafAuthenticationData?: never;
  ucafCollectionIndicator?: never;
};

export type Amex3DSPaymentAuthDTO = Base3DSPaymentAuthDTO & {
  brand: "AMERICAN EXPRESS";
  commerceIndicator: "aesk";
  cavv: string;
  xid: string;

  ucafAuthenticationData?: never;
  ucafCollectionIndicator?: never;
};

export type Mastercard3DSPaymentAuthDTO = Base3DSPaymentAuthDTO & {
  brand: "MASTERCARD";
  commerceIndicator: "spa";
  ucafAuthenticationData: string;
  ucafCollectionIndicator: string;

  cavv?: never;
  xid?: never;
};

export type Secure3DSPaymentAuthDTO =
  | Visa3DSPaymentAuthDTO
  | Amex3DSPaymentAuthDTO
  | Mastercard3DSPaymentAuthDTO;
