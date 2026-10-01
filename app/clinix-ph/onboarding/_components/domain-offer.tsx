"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/src/components/button";
import { formatCentavos } from "@/src/lib/pricing";
import {
  searchDomainsAction,
  startDomainCheckoutAction,
  type DomainSearchState,
} from "@/src/server/actions/domain";
import type { DomainOfferConfig } from "@/src/server/services/domain-offer";

/**
 * Optional last step: pick a custom domain and pay the first month plus the
 * domain in one charge. Skipping keeps the free subdomain and the trial.
 */
export function DomainOffer({ offer, defaultQuery }: { offer: DomainOfferConfig; defaultQuery: string }) {
  const [query, setQuery] = useState(defaultQuery);
  const [result, setResult] = useState<DomainSearchState>({});
  const [chosen, setChosen] = useState<string>();
  const [provider, setProvider] = useState(offer.providers[0].id);
  const [message, setMessage] = useState<string>();
  const [searching, startSearch] = useTransition();
  const [paying, startPay] = useTransition();

  function search(event: FormEvent) {
    event.preventDefault();
    setMessage(undefined);
    setChosen(undefined);
    startSearch(async () => setResult(await searchDomainsAction(query)));
  }

  const quote = result.quotes?.find((candidate) => candidate.domain === chosen);

  function pay() {
    if (!chosen) return;
    setMessage(undefined);
    startPay(async () => {
      const response = await startDomainCheckoutAction({ domain: chosen, provider });
      if (response.url) window.location.href = response.url;
      else setMessage(response.message);
    });
  }

  return (
    <section aria-labelledby="own-domain" className="flex flex-col gap-3">
      <div>
        <h3 id="own-domain" className="font-display text-sm font-extrabold">
          Want your own domain?
        </h3>
        <p className="text-xs text-slate-600">
          Pay once for your first month and a domain, and your clinic goes live on it within minutes. Or skip — your free
          subdomain keeps working and your trial stays.
        </p>
      </div>

      <form onSubmit={search} className="flex gap-2" role="search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Domain name"
          placeholder="yourclinic"
          autoComplete="off"
          className="min-h-11 min-w-0 flex-1 rounded-[10px] border border-slate-300 px-3 text-base focus-visible:outline-2 focus-visible:outline-brand"
        />
        <Button type="submit" variant="secondary" disabled={searching || query.trim().length < 2}>
          {searching ? "Searching…" : "Search"}
        </Button>
      </form>

      {result.message && <p role="status" className="text-xs text-slate-600">{result.message}</p>}

      {result.quotes && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="sr-only">Available domains</legend>
          {result.quotes.map((candidate) => (
            <label
              key={candidate.domain}
              className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-slate-200 px-3 text-sm has-[:checked]:border-brand has-[:checked]:bg-brand/5"
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="domain"
                  value={candidate.domain}
                  checked={chosen === candidate.domain}
                  onChange={() => setChosen(candidate.domain)}
                  className="accent-brand"
                />
                <span className="font-semibold">{candidate.domain}</span>
              </span>
              <span className="font-data text-xs text-slate-600">{formatCentavos(candidate.domainCentavos)}/yr</span>
            </label>
          ))}
        </fieldset>
      )}

      {quote && (
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-3">
          <dl className="flex flex-col gap-1 text-sm">
            <div className="flex justify-between"><dt>First month of Clinix PH</dt><dd className="font-data">{formatCentavos(quote.planCentavos)}</dd></div>
            <div className="flex justify-between"><dt>{quote.domain} · 1 year</dt><dd className="font-data">{formatCentavos(quote.domainCentavos)}</dd></div>
            <div className="flex justify-between border-t border-slate-200 pt-1 font-bold"><dt>Total today</dt><dd className="font-data">{formatCentavos(quote.totalCentavos)}</dd></div>
          </dl>
          {offer.providers.length > 1 && (
            <fieldset className="flex flex-wrap gap-2">
              <legend className="mb-1 text-xs font-semibold">Pay with</legend>
              {offer.providers.map((option) => (
                <label key={option.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border border-slate-200 px-3 text-sm has-[:checked]:border-brand">
                  <input type="radio" name="provider" value={option.id} checked={provider === option.id} onChange={() => setProvider(option.id)} className="accent-brand" />
                  {option.label}
                </label>
              ))}
            </fieldset>
          )}
          <p className="text-xs text-slate-600">
            The domain is registered and managed by DataBridgeSol and renews yearly. Charged in PHP; foreign cards are accepted.
          </p>
          <Button type="button" onClick={pay} disabled={paying}>
            {paying ? "Opening checkout…" : `Pay ${formatCentavos(quote.totalCentavos)}`}
          </Button>
        </div>
      )}

      {message && <p role="alert" className="text-sm text-red-700">{message}</p>}
    </section>
  );
}
