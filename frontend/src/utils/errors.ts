import { ApiError } from "../api/http";

export function errorDetails(error: unknown): {
  message: string;
  payload?: unknown;
} {
  if (error instanceof ApiError) {
    return {
      message: error.status
        ? "HTTP " + error.status + " · " + error.message
        : error.message,
      payload: error.payload,
    };
  }
  return {
    message: error instanceof Error ? error.message : "Unexpected error.",
  };
}
