import crypto from "crypto";
import { env } from "../config/env";

type HttpMethod = "get" | "post" | "put" | "patch" | "delete";

interface SignatureParams {
  method: HttpMethod;
  path: string;
  body?: unknown;
}

export function generateHttpSignature({ method, path, body }: SignatureParams) {
  const vDate = new Date().toUTCString();

  const requestTarget = `${method} ${path}`;

  let digest: string | undefined;

  let signatureString = "";

  if (method === "get") {
    signatureString = `host: ${env.cybs.host}
v-c-date: ${vDate}
request-target: ${requestTarget}
v-c-merchant-id: ${env.cybs.merchantId}`;
  } else {
    const rawBody = body ? JSON.stringify(body) : "";

    digest =
      "SHA-256=" +
      crypto.createHash("sha256").update(rawBody, "utf8").digest("base64");

    signatureString = `host: ${env.cybs.host}
v-c-date: ${vDate}
request-target: ${requestTarget}
digest: ${digest}
v-c-merchant-id: ${env.cybs.merchantId}`;
  }

  const signature = crypto
    .createHmac("sha256", Buffer.from(env.cybs.sharedSecret, "base64"))
    .update(signatureString, "utf8")
    .digest("base64");

  const headers: Record<string, string> = {
    host: env.cybs.host,
    "v-c-date": vDate,
    "v-c-merchant-id": env.cybs.merchantId,
  };

  if (digest) {
    headers.digest = digest;
    headers.signature = `keyid="${env.cybs.keyId}",algorithm="HmacSHA256",headers="host v-c-date request-target digest v-c-merchant-id",signature="${signature}"`;
  } else {
    headers.signature = `keyid="${env.cybs.keyId}",algorithm="HmacSHA256",headers="host v-c-date request-target v-c-merchant-id",signature="${signature}"`;
  }

  console.log("===== CYBS SIGNATURE =====");
  console.log("REQUEST TARGET:", requestTarget);
  console.log("STRING TO SIGN:");
  console.log(signatureString);
  console.log("SIGNATURE:", signature);

  return headers;
}
