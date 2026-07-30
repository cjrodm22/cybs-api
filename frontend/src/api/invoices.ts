import { apiGet, apiPost } from "./http";

export function createInvoice(body: unknown): Promise<unknown> {
  return apiPost("/api/invoices", body);
}

export function deliverInvoice(invoiceId: string): Promise<unknown> {
  return apiPost(
    "/api/invoices/" + encodeURIComponent(invoiceId) + "/delivery",
    {},
  );
}

export function getInvoiceById(invoiceId: string): Promise<unknown> {
  return apiGet("/api/invoices/" + encodeURIComponent(invoiceId));
}

export function publishInvoice(invoiceId: string): Promise<unknown> {
  return apiPost(
    "/api/invoices/" + encodeURIComponent(invoiceId) + "/publication",
    {},
  );
}

export function cancelInvoice(invoiceId: string): Promise<unknown> {
  return apiPost(
    "/api/invoices/" + encodeURIComponent(invoiceId) + "/cancelation",
    {},
  );
}
