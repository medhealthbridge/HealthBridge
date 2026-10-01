import { z } from "zod";
import { safeEqual } from "./crypto";
import { InvalidWebhookError, type PaymentProvider } from "./types";

const API = "https://api.xendit.co";

const auth = () => `Basic ${Buffer.from(`${process.env.XENDIT_SECRET_KEY}:`).toString("base64")}`;

async function call(path: string, init?: { method: string; body: unknown }) {
  const response = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: auth(), "Content-Type": "application/json" },
    body: init ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = z.object({ message: z.string() }).safeParse(json);
    throw new Error(`Xendit ${path} failed (${response.status}): ${detail.success ? detail.data.message : "no reason given"}`);
  }
  return json;
}

export const xendit: PaymentProvider = {
  id: "xendit",
  label: "Cards, bank, e-wallets",
  configured: () => Boolean(process.env.XENDIT_SECRET_KEY && process.env.XENDIT_CALLBACK_TOKEN),

  async createCheckout(input) {
    const json = await call("/v2/invoices", {
      method: "POST",
      body: {
        external_id: input.orderId,
        // Xendit takes PHP in whole currency units, not centavos.
        amount: input.totalCentavos / 100,
        currency: "PHP",
        description: input.description,
        payer_email: input.customerEmail,
        items: input.lines.map((line) => ({ name: line.name, quantity: 1, price: line.centavos / 100 })),
        success_redirect_url: input.successUrl,
        failure_redirect_url: input.cancelUrl,
        invoice_duration: 60 * 60 * 24,
      },
    });
    const created = z.object({ id: z.string(), invoice_url: z.url() }).parse(json);
    return { ref: created.id, url: created.invoice_url };
  },

  parseWebhook(rawBody, headers) {
    const token = process.env.XENDIT_CALLBACK_TOKEN;
    const received = headers.get("x-callback-token");
    if (!token || !received || !safeEqual(token, received)) throw new InvalidWebhookError("bad callback token");

    const body = z.object({ id: z.string(), external_id: z.string(), status: z.string() }).parse(JSON.parse(rawBody));
    return body.status === "PAID" || body.status === "SETTLED" ? { orderId: body.external_id, ref: body.id } : null;
  },

  async confirmPaid(ref) {
    const json = await call(`/v2/invoices/${encodeURIComponent(ref)}`);
    const invoice = z
      .object({ status: z.string(), amount: z.coerce.number(), paid_amount: z.coerce.number().nullish() })
      .parse(json);
    const paid = invoice.status === "PAID" || invoice.status === "SETTLED";
    return { paid, amountCentavos: Math.round((invoice.paid_amount ?? invoice.amount) * 100) };
  },
};
