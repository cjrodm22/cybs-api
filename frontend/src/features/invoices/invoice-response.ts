import { isRecord } from "../../utils/records";

export interface InvoiceLineItemView {
  productSku?: string;
  productName?: string;
  quantity?: string;
  unitPrice?: string;
  totalAmount?: string;
}

export interface InvoiceEventView {
  eventType?: string;
  eventDate?: string;
  transactionId?: string;
  amount?: string;
  raw: unknown;
}

export interface InvoiceView {
  invoiceId?: string;
  status?: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount?: string;
  balanceAmount?: string;
  paidAmount?: string;
  currency?: string;
  minimumPartialAmount?: string;
  paymentLink?: string;
  deliveryMode?: string;
  allowPartialPayments?: string;
  dueDate?: string;
  expirationDate?: string;
  paymentTransactionIds: string[];
  lineItems: InvoiceLineItemView[];
  events: InvoiceEventView[];
  cyberSourceInvoice?: unknown;
  savedInvoice?: unknown;
  updatedInvoice?: unknown;
}

export function invoiceViewFromResponse(
  response: unknown,
  fallback: Partial<InvoiceView> = {},
): InvoiceView {
  const actionData = unwrapData(response);
  const updatedInvoice = recordValue(actionData, "updatedInvoice");
  const invoiceSource = unwrapData(updatedInvoice ?? actionData);
  const source = isRecord(invoiceSource) ? invoiceSource : {};
  const savedInvoice = recordValue(source, "savedInvoice");
  const savedRow = recordValue(savedInvoice, "invoice") ?? {};
  const customer = recordValue(source, "customerInformation") ?? {};
  const invoiceInformation =
    recordValue(source, "invoiceInformation") ?? {};
  const orderInformation = recordValue(source, "orderInformation") ?? {};
  const amountDetails =
    recordValue(orderInformation, "amountDetails") ?? {};

  const rawLineItems =
    arrayValue(orderInformation, "lineItems") ??
    arrayValue(savedInvoice, "lineItems");
  const rawEvents =
    arrayValue(source, "invoiceHistory") ??
    arrayValue(savedInvoice, "events");
  const lineItems = rawLineItems
    ? rawLineItems.map(normalizeLineItem)
    : fallback.lineItems ?? [];
  const events = rawEvents
    ? rawEvents.map(normalizeEvent)
    : fallback.events ?? [];
  const paymentEvents = events.filter(
    (event) => event.eventType?.toUpperCase() === "PAYMENT",
  );
  const paidAmount = sumPaymentAmounts(paymentEvents);

  return {
    invoiceId:
      scalar(source.id) ??
      scalar(source.invoiceNumber) ??
      scalar(savedRow.cybs_invoice_id) ??
      scalar(savedRow.cybsInvoiceId) ??
      scalar(savedRow.invoice_number) ??
      fallback.invoiceId,
    status: scalar(source.status) ?? scalar(savedRow.status) ?? fallback.status,
    customerName:
      scalar(customer.name) ??
      scalar(savedRow.customer_name) ??
      scalar(savedRow.customerName) ??
      fallback.customerName,
    customerEmail:
      scalar(customer.email) ??
      scalar(savedRow.customer_email) ??
      scalar(savedRow.customerEmail) ??
      fallback.customerEmail,
    totalAmount:
      scalar(amountDetails.totalAmount) ??
      scalar(savedRow.total_amount) ??
      scalar(savedRow.totalAmount) ??
      fallback.totalAmount,
    balanceAmount:
      scalar(amountDetails.balanceAmount) ??
      scalar(savedRow.balance_amount) ??
      scalar(savedRow.balanceAmount) ??
      fallback.balanceAmount,
    paidAmount: paidAmount ?? fallback.paidAmount,
    currency:
      scalar(amountDetails.currency) ??
      scalar(savedRow.currency) ??
      fallback.currency,
    minimumPartialAmount:
      scalar(amountDetails.minimumPartialAmount) ??
      scalar(savedRow.minimum_partial_amount) ??
      scalar(savedRow.minimumPartialAmount) ??
      fallback.minimumPartialAmount,
    paymentLink:
      scalar(invoiceInformation.paymentLink) ??
      scalar(savedRow.payment_link) ??
      scalar(savedRow.paymentLink) ??
      fallback.paymentLink,
    deliveryMode:
      scalar(invoiceInformation.deliveryMode) ??
      scalar(savedRow.delivery_mode) ??
      scalar(savedRow.deliveryMode) ??
      fallback.deliveryMode,
    allowPartialPayments:
      booleanLabel(invoiceInformation.allowPartialPayments) ??
      booleanLabel(savedRow.allow_partial_payments) ??
      booleanLabel(savedRow.allowPartialPayments) ??
      fallback.allowPartialPayments,
    dueDate:
      scalar(invoiceInformation.dueDate) ??
      scalar(savedRow.due_date) ??
      scalar(savedRow.dueDate) ??
      fallback.dueDate,
    expirationDate:
      scalar(invoiceInformation.expirationDate) ??
      scalar(savedRow.expiration_date) ??
      scalar(savedRow.expirationDate) ??
      fallback.expirationDate,
    paymentTransactionIds: paymentEvents
      .map((event) => event.transactionId)
      .filter((value): value is string => Boolean(value)),
    lineItems,
    events,
    cyberSourceInvoice: source,
    savedInvoice,
    updatedInvoice,
  };
}

export function responsePart(
  response: unknown,
  key: "savedInvoice" | "updatedInvoice",
): unknown {
  const data = unwrapData(response);
  if (!isRecord(data)) return undefined;
  if (key === "updatedInvoice") return data.updatedInvoice;
  const updated = unwrapData(data.updatedInvoice);
  if (isRecord(updated) && updated.savedInvoice !== undefined) {
    return updated.savedInvoice;
  }
  return data.savedInvoice;
}

function unwrapData(value: unknown): unknown {
  if (isRecord(value) && value.data !== undefined) return value.data;
  return value;
}

function recordValue(
  value: unknown,
  key: string,
): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const candidate = value[key];
  return isRecord(candidate) ? candidate : undefined;
}

function arrayValue(value: unknown, key: string): unknown[] | undefined {
  if (!isRecord(value)) return undefined;
  return Array.isArray(value[key]) ? value[key] : undefined;
}

function scalar(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return undefined;
}

function booleanLabel(value: unknown): string | undefined {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return undefined;
}

function normalizeLineItem(value: unknown): InvoiceLineItemView {
  if (!isRecord(value)) return {};
  return {
    productSku: scalar(value.productSku) ?? scalar(value.product_sku),
    productName: scalar(value.productName) ?? scalar(value.product_name),
    quantity: scalar(value.quantity),
    unitPrice: scalar(value.unitPrice) ?? scalar(value.unit_price),
    totalAmount: scalar(value.totalAmount) ?? scalar(value.total_amount),
  };
}

function normalizeEvent(value: unknown): InvoiceEventView {
  if (!isRecord(value)) return { raw: value };
  const transactionDetails = recordValue(value, "transactionDetails") ?? {};
  return {
    eventType: scalar(value.event) ?? scalar(value.eventType) ?? scalar(value.event_type),
    eventDate: scalar(value.date) ?? scalar(value.eventDate) ?? scalar(value.event_date),
    transactionId:
      scalar(transactionDetails.transactionId) ??
      scalar(value.transactionId) ??
      scalar(value.transaction_id),
    amount:
      scalar(transactionDetails.amount) ?? scalar(value.amount),
    raw: value,
  };
}

function sumPaymentAmounts(events: InvoiceEventView[]): string | undefined {
  const amounts = events
    .map((event) => Number(event.amount))
    .filter((amount) => Number.isFinite(amount));
  if (amounts.length === 0) return undefined;
  return amounts.reduce((total, amount) => total + amount, 0).toFixed(2);
}
