import { cybsClient } from "../../cybs/cybsClient";
import { generateHttpSignature } from "../../cybs/httpSignature";

export async function RefundAuthorization(paymentId: string, body: any) {
  const path = `/pts/v2/payments/${paymentId}/refunds`;

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

export async function RefundCapture(paymentId: string, body: any) {
  const path = `/pts/v2/captures/${paymentId}/refunds`;
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
