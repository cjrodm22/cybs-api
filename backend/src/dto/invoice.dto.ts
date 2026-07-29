export type InvoiceStatus =
  | "DRAFT"
  | "SENT"
  | "PARTIAL"
  | "PAID"
  | "CANCELLED"
  | "EXPIRED"
  | string;

export interface InvoiceLineItemDTO {
  productSku?: string | null;
  productName?: string | null;
  quantity?: string | number | null;
  unitPrice?: string | number | null;
  totalAmount?: string | number | null;
}

export interface InvoiceEventDTO {
  eventType?: string | null;
  eventDate?: string | null;
  transactionId?: string | null;
  amount?: string | number | null;
  rawEvent?: unknown;
}

export interface CreateOrUpdateInvoiceDTO {
  cybsInvoiceId: string;
  invoiceNumber?: string | null;
  status?: InvoiceStatus | null;
  customerName?: string | null;
  customerEmail?: string | null;
  submitTimeUtc?: string | null;
  dueDate?: string | null;
  expirationDate?: string | null;
  allowPartialPayments?: boolean | null;
  minimumPartialAmount?: string | number | null;
  totalAmount?: string | number | null;
  balanceAmount?: string | number | null;
  currency?: string | null;
  paymentLink?: string | null;
  deliveryMode?: string | null;
  rawResponse?: unknown;
}

export interface CyberSourceInvoiceResponse {
  id: string;
  submitTimeUtc?: string;
  status?: string;

  customerInformation?: {
    name?: string;
    email?: string;
  };

  invoiceInformation?: {
    invoiceNumber?: string;
    dueDate?: string;
    expirationDate?: string;
    allowPartialPayments?: boolean;
    paymentLink?: string;
    deliveryMode?: string;
  };

  orderInformation?: {
    amountDetails?: {
      totalAmount?: string | number;
      balanceAmount?: string | number;
      minimumPartialAmount?: string | number;
      currency?: string;
    };
    lineItems?: Array<{
      productSku?: string;
      productName?: string;
      quantity?: string | number;
      unitPrice?: string | number;
      totalAmount?: string | number;
    }>;
  };

  invoiceHistory?: Array<{
    event?: string;
    date?: string;
    transactionDetails?: {
      transactionId?: string;
      amount?: string | number;
    };
  }>;
}

export interface InvoiceWithDetailsDTO {
  invoice: unknown;
  lineItems: unknown[];
  events: unknown[];
}
