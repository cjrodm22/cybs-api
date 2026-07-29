import { response } from "express";
import { cybsClient } from "../../cybs/cybsClient";
import { generateHttpSignature } from "../../cybs/httpSignature";

export async function VoidPayment(paymentId: string, body: any) {
  const path = `/pts/v2/payments/${paymentId}/voids`;

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

export async function VoidCapture(paymentId: string, body: any) {
  const path = `/pts/v2/captures/${paymentId}/voids`;

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

export async function voidRefund(paymentId: string, body: any) {
  const path = `/pts/v2/refunds/${paymentId}/voids`;

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

export async function voidCredit(paymentId: string, body: any) {
  const path = `/pts/v2/credits/${paymentId}/voids`;

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
