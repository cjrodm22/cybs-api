import { isRecord } from "./records";

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
    ? "•••• •••• •••• " + digits.slice(-4)
    : "[REDACTED]";
}
