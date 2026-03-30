import { z } from "@medusajs/framework/zod";

export const SubscribeSchema = z.object({
  email: z.string().email(),
  source: z.enum(["footer", "checkout", "account", "import"]).default("footer"),
  company: z.string().optional(),
});

export const UnsubscribeSchema = z.object({
  token: z.string().min(1),
});
