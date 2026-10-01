import { after } from "next/server";
import { fulfillPaidOrder } from "@/src/server/services/domain-orders";
import { paymentProvider } from "@/src/server/services/payments";

export const maxDuration = 60;

/**
 * Payment providers call this when a checkout is paid. The signature is checked
 * first; the order is then confirmed against the provider's own API before
 * anything is bought, so a forged or replayed body can't trigger a purchase.
 */
export async function POST(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const provider = paymentProvider((await params).provider);
  if (!provider || !provider.configured()) return new Response(null, { status: 404 });

  const raw = await request.text();
  let paid;
  try {
    paid = provider.parseWebhook(raw, request.headers);
  } catch {
    // A bad signature, or a body that isn't the provider's JSON.
    return new Response(null, { status: 400 });
  }

  // Acknowledge now; buying the domain can take a while and is idempotent.
  if (paid) after(() => fulfillPaidOrder(paid.orderId, paid.ref));
  return new Response(null, { status: 200 });
}
