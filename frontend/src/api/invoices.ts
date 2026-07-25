import { apiPost } from "./http";

export function createInvoice(body: unknown): Promise<unknown> {
  return apiPost("/api/invoices", body);
}

export function deliverInvoice(invoiceId: string): Promise<unknown> {
  return apiPost(
    "/api/invoices/" + encodeURIComponent(invoiceId) + "/delivery",
    {},
  );
}
