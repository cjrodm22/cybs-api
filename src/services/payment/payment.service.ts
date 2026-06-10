import { cybsClient } from "../../cybs/cybsClient";
import { generateHttpSignature } from "../../cybs/httpSignature";

export async function SimpleAuthorization(body: any) {
  const path = "/pts/v2/payments";

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

export async function IncrementAnAuthorization(paymentId: string, body: any) {
  const path = `/pts/v2/payments/${paymentId}`;

  const headers = generateHttpSignature({
    method: "patch",
    path,
    body,
  });
  const response = await cybsClient.patch(path, body, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}
