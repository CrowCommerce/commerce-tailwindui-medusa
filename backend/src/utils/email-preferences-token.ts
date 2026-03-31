import { MedusaError } from "@medusajs/framework/utils";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { resolveStorefrontUrl } from "../subscribers/_helpers/resolve-urls";

const EMAIL_PREFERENCES_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;
const EMAIL_PREFERENCES_TOKEN_TYPE = "email_preferences";

type EmailPreferencesTokenPayload = {
  email: string;
  type: typeof EMAIL_PREFERENCES_TOKEN_TYPE;
};

function getEmailPreferencesSecret(): string {
  return process.env.JWT_SECRET || "supersecret";
}

export function issueEmailPreferencesToken(email: string): string {
  return jwt.sign(
    {
      email: email.trim().toLowerCase(),
      type: EMAIL_PREFERENCES_TOKEN_TYPE,
    } satisfies EmailPreferencesTokenPayload,
    getEmailPreferencesSecret(),
    {
      expiresIn: EMAIL_PREFERENCES_TOKEN_TTL_SECONDS,
    },
  );
}

export function verifyEmailPreferencesToken(token: string): string {
  try {
    const decoded = jwt.verify(
      token,
      getEmailPreferencesSecret(),
    ) as EmailPreferencesTokenPayload;

    if (
      decoded.type !== EMAIL_PREFERENCES_TOKEN_TYPE ||
      typeof decoded.email !== "string"
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid or expired email preferences token",
      );
    }

    return decoded.email.trim().toLowerCase();
  } catch (error) {
    if (
      error instanceof TokenExpiredError ||
      error instanceof JsonWebTokenError ||
      error instanceof MedusaError
    ) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Invalid or expired email preferences token",
      );
    }

    throw error;
  }
}

export function buildEmailPreferencesUrl(email: string): string | null {
  const storefrontUrl = resolveStorefrontUrl();
  if (!storefrontUrl) {
    return null;
  }

  const token = issueEmailPreferencesToken(email);
  return `${storefrontUrl}/email-preferences?token=${encodeURIComponent(token)}`;
}
