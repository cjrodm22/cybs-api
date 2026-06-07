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

export async function sendInvoice(invoiceId: number) {
  const path = `/invoicing/v2/invoices/${invoiceId}/delivery`;

  const body = {};

  const headers = generateHttpSignature({
    method: "post",
    path,
    body,
  });

  const response = await cybsClient.post(path, body, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
      Connection: "close",
    },
  });

  return response.data;
}

export async function cancelInvoice(invoiceId: number) {
  const path = `/invoicing/v2/invoices/${invoiceId}/cancelation`;

  const body = {};

  const headers = generateHttpSignature({
    method: "post",
    path,
    body,
  });

  const response = await cybsClient.post(path, body, {
    headers,
  });

  return response.data;
}

export async function publishInvoice(invoiceId: number) {
  const path = `/invoicing/v2/invoices/${invoiceId}/publication`;

  const body = {};

  const headers = generateHttpSignature({
    method: "post",
    path,
    body,
  });

  const response = await cybsClient.post(path, body, {
    headers,
  });
  return response.data;
}

export async function createInvoice(body: any) {
  const path = "/invoicing/v2/invoices";

  const headers = generateHttpSignature({
    method: "post",
    path,
    body,
  });

  const response = await cybsClient.post(path, body, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  return response.data;
}

export async function updateInvoice(invoiceId: number, body: any) {
  const put = `/invoicing/v2/invoices/${invoiceId}`;

  const headers = generateHttpSignature({
    method: "put",
    path: put,
    body,
  });

  const response = await cybsClient.put(put, body, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  return response.data;
}
