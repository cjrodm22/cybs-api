import { cybsClient } from "../../cybs/cybsClient";
import { generateHttpSignature } from "../../cybs/httpSignature";
import { createOrUpdateInvoiceFromCybsResponse } from "../../repositories/invoices.repository";

async function syncInvoiceWithDatabase(data: any) {
  if (!data?.id) {
    return null;
  }

  return await createOrUpdateInvoiceFromCybsResponse(data);
}

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

export async function getInvoiceById(invoiceId: string | number) {
  const path = `/invoicing/v2/invoices/${invoiceId}`;

  const headers = generateHttpSignature({
    method: "get",
    path,
  });

  const response = await cybsClient.get(path, {
    headers,
  });

  const data = response.data;

  const savedInvoice = await syncInvoiceWithDatabase(data);

  return {
    ...data,
    savedInvoice,
  };
}

export async function sendInvoice(invoiceId: string | number) {
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

  const deliveryResponse = response.data;

  const updatedInvoice = await getInvoiceById(invoiceId);

  return {
    deliveryResponse,
    updatedInvoice,
  };
}

export async function cancelInvoice(invoiceId: string | number) {
  const path = `/invoicing/v2/invoices/${invoiceId}/cancelation`;

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
    },
  });

  const cancelResponse = response.data;

  const updatedInvoice = await getInvoiceById(invoiceId);

  return {
    cancelResponse,
    updatedInvoice,
  };
}

export async function publishInvoice(invoiceId: string | number) {
  const path = `/invoicing/v2/invoices/${invoiceId}/publication`;

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
    },
  });

  const publicationResponse = response.data;

  const updatedInvoice = await getInvoiceById(invoiceId);

  return {
    publicationResponse,
    updatedInvoice,
  };
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

  const data = response.data;

  const savedInvoice = await syncInvoiceWithDatabase(data);

  return {
    ...data,
    savedInvoice,
  };
}

export async function updateInvoice(invoiceId: string | number, body: any) {
  const path = `/invoicing/v2/invoices/${invoiceId}`;

  const headers = generateHttpSignature({
    method: "put",
    path,
    body,
  });

  const response = await cybsClient.put(path, body, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  const updateResponse = response.data;

  const updatedInvoice = await getInvoiceById(invoiceId);

  return {
    updateResponse,
    updatedInvoice,
  };
}
