import { apiPost } from "./http";

export function setupPayerAuthentication(body: unknown): Promise<unknown> {
  return apiPost("/api/risk", body);
}

export function checkEnrollment(body: unknown): Promise<unknown> {
  return apiPost("/api/risk/authentications", body);
}

export function validateAuthentication(body: unknown): Promise<unknown> {
  return apiPost("/api/risk/authentication-results", body);
}
