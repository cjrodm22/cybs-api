import { isRecord } from "./api";
import type { FlowSummary } from "./types";

const sensitiveKeyPattern =
  /^(number|cardNumber|accountNumber|cavv|xid|ucafAuthenticationData|accessToken|jwt)$/i;

export function sanitizeForDisplay(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeForDisplay);
  if (!isRecord(value)) return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => {
      if (sensitiveKeyPattern.test(key)) {
        if (/^(number|cardNumber|accountNumber)$/i.test(key)) {
          return [key, maskCardNumber(typeof item === "string" ? item : "")];
        }
        return [key, "[REDACTED]"];
      }
      return [key, sanitizeForDisplay(item)];
    }),
  );
}

export function maskCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 4
    ? `•••• •••• •••• ${digits.slice(-4)}`
    : "[REDACTED]";
}

export function findValue(
  value: unknown,
  keys: readonly string[],
): string | undefined {
  const queue: unknown[] = [value];
  const visited = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }
    if (!isRecord(current)) continue;

    for (const key of keys) {
      const candidate = current[key];
      if (typeof candidate === "string" || typeof candidate === "number") {
        return String(candidate);
      }
    }
    queue.push(...Object.values(current));
  }

  return undefined;
}

export function summaryFromResponse(value: unknown): Partial<FlowSummary> {
  return compact({
    referenceId: findValue(value, ["referenceId", "reference_id"]),
    payerAuthSessionId: findValue(value, [
      "payerAuthSessionId",
      "payer_auth_session_id",
      "payerAuthSessionID",
    ]),
    authenticationTransactionId: findValue(value, [
      "authenticationTransactionId",
      "authentication_transaction_id",
    ]),
    status: findValue(value, ["status"]),
    eci: findValue(value, ["eciRaw", "eci"]),
    commerceIndicator: findValue(value, [
      "commerceIndicator",
      "commerce_indicator",
      "ecommerceIndicator",
      "indicator",
    ]),
    brand: findValue(value, ["brand"]),
    approvalCode: findValue(value, ["approvalCode", "approval_code"]),
    messageResponse: findValue(value, ["messageResponse", "message_response"]),
    deniedReason: findValue(value, ["deniedReason", "denied_reason"]),
  });
}

function compact<T extends Record<string, string | undefined>>(
  value: T,
): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Partial<T>;
}
