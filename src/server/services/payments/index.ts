import { paymongo } from "./paymongo";
import { xendit } from "./xendit";
import type { PaymentProvider, PaymentProviderId } from "./types";

const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = { paymongo, xendit };

export function paymentProvider(id: string) {
  return id in PROVIDERS ? PROVIDERS[id as PaymentProviderId] : null;
}

/** Only providers whose keys are set, so the checkout never offers one that can't complete. */
export function configuredProviders() {
  return Object.values(PROVIDERS).filter((provider) => provider.configured());
}

export { InvalidWebhookError } from "./types";
export type { PaymentProvider, PaymentProviderId } from "./types";
