export type PaymentProviderId = "paymongo" | "xendit";

export type CheckoutInput = {
  orderId: string;
  totalCentavos: number;
  description: string;
  lines: { name: string; centavos: number }[];
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type Checkout = { ref: string; url: string };

export class InvalidWebhookError extends Error {}

export type PaymentProvider = {
  id: PaymentProviderId;
  label: string;
  configured(): boolean;
  createCheckout(input: CheckoutInput): Promise<Checkout>;
  /**
   * Verifies the signature and returns the order a "paid" event is about, or
   * null for events that don't matter. Never trusts the amount in the payload:
   * `confirmPaid` re-reads it from the provider's API.
   */
  parseWebhook(rawBody: string, headers: Headers): { orderId: string; ref: string } | null;
  confirmPaid(ref: string): Promise<{ paid: boolean; amountCentavos: number }>;
};
