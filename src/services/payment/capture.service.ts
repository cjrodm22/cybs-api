import { cybsClient } from "../../cybs/cybsClient";
import { generateHttpSignature } from "../../cybs/httpSignature";

export async function CaptureAuthorization(paymentId: string, body: any) {
  const path = `/pts/v2/payments/${paymentId}/captures`;

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
