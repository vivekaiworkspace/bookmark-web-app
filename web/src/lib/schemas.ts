import { z } from "zod";

export const enqueueBodySchema = z.object({
  linkId: z.string().uuid(),
  force: z.boolean().optional(),
});

export const extractMetaBodySchema = z.object({
  url: z.string().min(1),
});

export const semanticSearchBodySchema = z.object({
  query: z.string().min(2),
});

export const askBodySchema = z.object({
  question: z.string().min(4),
});

export const pushSubscribeBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const pushUnsubscribeBodySchema = z.object({
  endpoint: z.string().url().optional(),
});

export const emptyJsonBodySchema = z.object({}).strict();

export const stripeSignatureSchema = z.string().min(1);
export const stripeWebhookBodySchema = z.string().min(1);

export const cronSecretHeaderSchema = z.string().min(1);
