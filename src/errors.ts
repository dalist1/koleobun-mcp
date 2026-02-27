import type { ToolResponse } from "./types";

export class KoleoApiError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super(`Koleo API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

export function handleToolError(error: unknown): ToolResponse {
  if (error instanceof KoleoApiError) {
    if (error.status === 404) {
      return {
        data: null,
        summary: `Not found: ${error.body || "requested resource does not exist"}`,
        error: "not_found",
        koleo_url: "",
      };
    }

    if (error.status === 401 || error.status === 403) {
      return {
        data: null,
        summary:
          "Authentication required. Create ~/.config/koleo-mcp/config.json with email and password.",
        error: "auth_required",
        koleo_url: "",
      };
    }

    return {
      data: null,
      summary: `Error: KoleoApiError(${error.status}): ${error.body || "unknown API error"}`,
      error: "unknown",
      koleo_url: "",
    };
  }

  if (error instanceof Error) {
    if (error.message.startsWith("Invalid ISO datetime")) {
      return {
        data: null,
        summary: error.message,
        error: "invalid_params",
        koleo_url: "",
      };
    }

    return {
      data: null,
      summary: `Error: ${error.name}: ${error.message}`,
      error: "unknown",
      koleo_url: "",
    };
  }

  return {
    data: null,
    summary: "Error: unknown",
    error: "unknown",
    koleo_url: "",
  };
}
