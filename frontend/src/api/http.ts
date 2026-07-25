import { isRecord } from "../utils/records";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function apiPost(path: string, body: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(API_BASE_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(
      error instanceof Error ? error.message : "Unable to reach the backend.",
      0,
      undefined,
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const payload: unknown = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      isRecord(payload) && typeof payload.message === "string"
        ? payload.message
        : "Request failed with HTTP " + response.status + ".";
    throw new ApiError(message, response.status, payload);
  }
  return payload;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    return (await fetch(API_BASE_URL + "/health")).ok;
  } catch {
    return false;
  }
}
