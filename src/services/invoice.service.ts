import { cybsClient } from "../cybs/cybsClient";
import { generateHttpSignature } from "../cybs/httpSignature";

export async function getInvoices() {
  const path = "/invoicing/v2/invoices?offset=0&limit=5";

  const headers = generateHttpSignature({
    method: "get",
    path,
  });

  const response = await cybsClient.get(path, {
    headers,
  });

  return response.data;
}

export async function getInvoiceById(invoiceId: number) {
  const path = `/invoicing/v2/invoices/${invoiceId}`;

  const headers = generateHttpSignature({
    method: "get",
    path,
  });

  const response = await cybsClient.get(path, {
    headers,
  });

  return response.data;
}
