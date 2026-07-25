import type { FlowSummary } from "../features/payer-auth/types";
import { isRecord } from "./records";

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
