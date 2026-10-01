import { z } from "zod";
import { hmacHex, safeEqual } from "./crypto";
import { InvalidWebhookError, type PaymentProvider } from "./types";

const API = "https://api.paymongo.com/v1";
const TOLERANCE_SECONDS = 5 * 60;

const auth = () => `Basic ${Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString("base64")}`;

async function call(path: string, init?: { method: string; body: unknown }) {
  const response = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: auth(), "Content-Type": "application/json", Accept: "application/json" },
    body: init ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = z.object({ errors: z.array(z.object({ detail: z.string() })).min(1) }).safeParse(json);
    throw new Error(`PayMongo ${path} failed (${response.status}): ${detail.success ? detail.data.errors[0].detail : "no reason given"}`);
  }
  return json;
}

const webhookSchema = z.object({
  data: z.object({
    attributes: z.object({
      type: z.string(),
      livemode: z.boolean().optional(),
      data: z
        .object({
          id: z.string(),
          attributes: z
            .object({
              reference_number: z.string().nullish().transform((value) => value ?? undefined),
              metadata: z.object({ orderId: z.string().optional() }).nullish(),
            })
            .transform((attributes) => ({
              reference_number: attributes.reference_number,
              metadata: { orderId: attributes.metadata?.orderId },
            })),
        })
        .optional(),
    }),
  }),
});

const sessionSchema = z.object({
  data: z.object({
    attributes: z.object({
      payments: z.array(z.object({ attributes: z.object({ status: z.string().optional(), amount: z.number() }) })).nullish(),
    }),
  }),
});

export const paymongo: PaymentProvider = {
  id: "paymongo",
  label: "GCash, Maya, cards",
  configured: () => Boolean(process.env.PAYMONGO_SECRET_KEY && process.env.PAYMONGO_WEBHOOK_SECRET),

  async createCheckout(input) {
    const json = await call("/checkout_sessions", {
      method: "POST",
      body: {
        data: {
          attributes: {
            billing: { email: input.customerEmail },
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: input.description,
            reference_number: input.orderId,
            line_items: input.lines.map((line) => ({
              currency: "PHP",
              amount: line.centavos,
              name: line.name,
              quantity: 1,
            })),
            // Methods PayMongo offers on a PH account; cards also take foreign (e.g. US) cards.
            payment_method_types: ["gcash", "paymaya", "card", "grab_pay", "qrph"],
            success_url: input.successUrl,
            cancel_url: input.cancelUrl,
            metadata: { orderId: input.orderId },
          },
        },
      },
    });
    const created = z.object({ data: z.object({ id: z.string(), attributes: z.object({ checkout_url: z.url() }) }) }).parse(json);
    return { ref: created.data.id, url: created.data.attributes.checkout_url };
  },

  parseWebhook(rawBody, headers) {
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
    const header = headers.get("paymongo-signature");
    if (!secret || !header) throw new InvalidWebhookError("missing signature");

    const parts = Object.fromEntries(header.split(",").map((pair) => pair.split("=") as [string, string]));
    const timestamp = Number(parts.t);
    if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) {
      throw new InvalidWebhookError("stale timestamp");
    }
    const body = webhookSchema.parse(JSON.parse(rawBody));
    const live = body.data.attributes.livemode === true;
    const expected = hmacHex(secret, `${parts.t}.${rawBody}`);
    if (!safeEqual(expected, (live ? parts.li : parts.te) ?? "")) throw new InvalidWebhookError("bad signature");

    if (body.data.attributes.type !== "checkout_session.payment.paid") return null;
    const session = body.data.attributes.data;
    const orderId = session?.attributes?.metadata?.orderId ?? session?.attributes?.reference_number;
    return orderId && session ? { orderId, ref: session.id } : null;
  },

  async confirmPaid(ref) {
    const json = await call(`/checkout_sessions/${encodeURIComponent(ref)}`);
    const { data } = sessionSchema.parse(json);
    const paid = (data.attributes.payments ?? []).filter((payment) => payment.attributes.status === "paid");
    return {
      paid: paid.length > 0,
      amountCentavos: paid.reduce((sum, payment) => sum + payment.attributes.amount, 0),
    };
  },
};
