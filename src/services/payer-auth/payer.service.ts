import { cybsClient } from "../../cybs/cybsClient";
import { generateHttpSignature } from "../../cybs/httpSignature";

export async function SetupPayerAuth(body: any) {
  const path = `/risk/v1/authentication-setups`;

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

export async function CheckEnrollmentPayerAuth(body: any) {
  const path = `/risk/v1/authentications`;

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

export async function ValidatePayerAuth(body: any) {
  const path = `/risk/v1/authentication-results`;

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
