import { configuredProviders } from "./payments";
import { registrarConfigured } from "./registrar";

export type DomainOfferConfig = { providers: { id: string; label: string }[] };

/** The checkout is offered only when both a registrar and a payment provider are set up. */
export function domainOfferConfig(): DomainOfferConfig | null {
  const providers = configuredProviders().map(({ id, label }) => ({ id, label }));
  return registrarConfigured() && providers.length > 0 ? { providers } : null;
}
