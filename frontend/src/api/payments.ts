import { apiPost } from "./http";

export function authorizePayment(body: unknown): Promise<unknown> {
  return apiPost("/api/payments", body);
}

export function authorize3DSPayment(body: unknown): Promise<unknown> {
  return apiPost("/api/payments/3ds", body);
}
