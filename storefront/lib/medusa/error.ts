/**
 * Centralized error formatting for Medusa SDK errors.
 *
 * The @medusajs/js-sdk throws FetchError with { message, status, statusText }
 * rather than axios-style errors (which the reference starter uses).
 */

interface MedusaFetchError {
  status?: number;
  statusText?: string;
  message: string;
}

function isFetchError(error: unknown): error is MedusaFetchError {
  return (
    error !== null &&
    typeof error === "object" &&
    "status" in error &&
    "message" in error
  );
}

export function medusaError(error: unknown): never {
  if (isFetchError(error)) {
    console.error(
      `[Medusa] ${error.status ?? "unknown"} ${error.statusText ?? ""}: ${error.message}`,
    );
    const msg = error.message || "An error occurred with the Medusa request";
    throw new Error(msg.charAt(0).toUpperCase() + msg.slice(1));
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error("An unknown error occurred with the Medusa request");
}
