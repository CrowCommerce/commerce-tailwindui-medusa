import { createHash } from "node:crypto";
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import * as Sentry from "@sentry/node";
import { sendContactFormMessageWorkflow } from "../../../workflows/notifications/send-contact-form-message";
import type { PostStoreContactSchema } from "./validators";

function getMessageLengthBucket(message: string): "short" | "medium" | "long" {
  if (message.length < 100) return "short";
  if (message.length < 400) return "medium";
  return "long";
}

export async function POST(
  req: MedusaRequest<PostStoreContactSchema>,
  res: MedusaResponse,
) {
  const { company: _company, ...input } = req.validatedBody;
  const analyticsActorId = `contact_${createHash("sha256")
    .update(input.email)
    .digest("hex")
    .slice(0, 24)}`;
  let analytics: { track: (payload: unknown) => Promise<void> } | null = null;

  try {
    analytics = req.scope.resolve(Modules.ANALYTICS);
  } catch {
    analytics = null;
  }

  try {
    await sendContactFormMessageWorkflow(req.scope).run({
      input,
    });

    if (analytics) {
      await analytics.track({
        event: "contact_form_submitted",
        actor_id: analyticsActorId,
        properties: {
          source: "store_contact_api",
          subject_length: input.subject.length,
          message_length_bucket: getMessageLengthBucket(input.message),
        },
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    if (analytics) {
      await analytics.track({
        event: "contact_form_failed",
        actor_id: analyticsActorId,
        properties: {
          source: "store_contact_api",
          error_type:
            error instanceof Error && error.name
              ? error.name
              : "contact_send_failed",
        },
      });
    }

    Sentry.captureException(error, {
      tags: {
        route: "store_contact",
        step: "send_contact_form_message",
      },
      extra: {
        subject_length: input.subject.length,
        message_length: input.message.length,
      },
    });

    res.status(500).json({
      message: "We couldn't send your message. Please try again later.",
      type: "contact_send_failed",
    });
  }
}
