/**
 * Centralized error formatting for Medusa SDK errors.
 *
 * The @medusajs/js-sdk throws FetchError with { message, status, statusText }
 * rather than axios-style errors (which the reference starter uses).
 */
export function medusaError(error: unknown): never {
  // FetchError from @medusajs/js-sdk
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "message" in error
  ) {
    const fe = error as {
      status?: number;
      statusText?: string;
      message: string;
    };
    console.error(
      `[Medusa] ${fe.status ?? "unknown"} ${fe.statusText ?? ""}: ${fe.message}`,
    );
    const msg = fe.message || "An error occurred with the Medusa request";
    throw new Error(msg.charAt(0).toUpperCase() + msg.slice(1));
  }

  // Standard Error
  if (error instanceof Error) {
    throw error;
  }

  // Unknown shape
  throw new Error("An unknown error occurred with the Medusa request");
}
