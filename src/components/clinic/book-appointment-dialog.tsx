"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { ConsoleButton } from "@/src/components/console/console-button";
import { ConsoleDialog } from "@/src/components/console/console-dialog";
import { CONSOLE_INPUT } from "@/src/components/console/console-input";
import { DrawerHeader } from "@/src/components/console/drawer-header";
import { FormField } from "@/src/components/console/form-field";
import { useToast } from "@/src/components/console/toast";
import { bookAppointmentAction, searchPatientsForBookingAction, type BookState } from "@/src/server/actions/appointments";
import type { PractitionerOption } from "@/src/server/services/clinic-app";

const INITIAL: BookState = {};
type Match = { id: string; label: string };

/** Book a patient with a service and practitioner at a clinic-local date and time. */
export function BookAppointmentDialog({ practitioners, services, defaultDate }: { practitioners: PractitionerOption[]; services: { id: string; label: string }[]; defaultDate: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(bookAppointmentAction, INITIAL);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [chosen, setChosen] = useState<Match | null>(null);
  const toast = useToast();
  const handled = useRef(state);

  useEffect(() => {
    if (state.booked && handled.current !== state) {
      setOpen(false);
      setChosen(null);
      setQuery("");
      toast("Appointment booked");
    }
    handled.current = state;
  }, [state, toast]);

  // Look patients up as the person types, after a short pause.
  useEffect(() => {
    if (chosen || query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const found = await searchPatientsForBookingAction(query);
      if (!cancelled) setMatches(found);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, chosen]);

  const errors = state.fieldErrors ?? {};
  const v = (key: string) => (state.values as Record<string, string> | undefined)?.[key];

  return (
    <>
      <ConsoleButton variant="primary" onClick={() => setOpen(true)}>
        <CalendarPlus aria-hidden="true" className="size-4" /> Book appointment
      </ConsoleButton>
      <ConsoleDialog open={open} onClose={() => setOpen(false)} label="Book appointment">
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader title="Book appointment" subtitle="Times are in the clinic's own timezone." onClose={() => setOpen(false)} />
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <FormField id="bk-patient-search" label="Patient" error={errors.patientId?.[0]} hint={chosen ? undefined : "Type a name, MRN or mobile"}>
              {chosen ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-console-line px-3 py-2 text-[13px]">
                  <span className="min-w-0 truncate font-semibold">{chosen.label}</span>
                  <button type="button" onClick={() => { setChosen(null); setMatches([]); }} className="min-h-11 shrink-0 cursor-pointer px-1 text-xs font-semibold text-console-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-console-accent md:min-h-0">Change</button>
                </div>
              ) : (
                <>
                  <input id="bk-patient-search" value={query} onChange={(event) => setQuery(event.target.value)} autoComplete="off" role="combobox" aria-expanded={matches.length > 0} aria-controls="bk-patient-results" className={CONSOLE_INPUT} />
                  {matches.length > 0 && (
                    <ul id="bk-patient-results" role="listbox" className="rounded-lg border border-console-line bg-console-canvas p-1">
                      {matches.map((match) => (
                        <li key={match.id} role="option" aria-selected="false">
                          <button type="button" onClick={() => setChosen(match)} className="min-h-11 w-full cursor-pointer rounded-md px-2.5 text-left text-[13px] hover:bg-console-ink/6 focus-visible:outline-2 focus-visible:outline-console-accent md:min-h-9">{match.label}</button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </FormField>
            <input type="hidden" name="patientId" value={chosen?.id ?? ""} />
            <FormField id="bk-service" label="Service" hint="Sets how long the slot is">
              <select id="bk-service" name="serviceId" defaultValue={v("serviceId") ?? ""} className={CONSOLE_INPUT}>
                <option value="">No specific service (30 min)</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.label}</option>)}
              </select>
            </FormField>
            <FormField id="bk-practitioner" label="Practitioner">
              <select id="bk-practitioner" name="practitionerStaffId" defaultValue={v("practitionerStaffId") ?? ""} className={CONSOLE_INPUT}>
                <option value="">Anyone available</option>
                {practitioners.map((person) => <option key={person.staffId} value={person.staffId}>{person.name}</option>)}
              </select>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField id="bk-date" label="Date" error={errors.date?.[0]}>
                <input id="bk-date" name="date" type="date" required defaultValue={v("date") ?? defaultDate} className={CONSOLE_INPUT} />
              </FormField>
              <FormField id="bk-time" label="Time" error={errors.time?.[0]}>
                <input id="bk-time" name="time" type="time" required step={300} defaultValue={v("time") ?? ""} className={CONSOLE_INPUT} />
              </FormField>
            </div>
            {state.message && <p role="alert" className="text-xs text-console-danger">{state.message}</p>}
          </div>
          <div className="flex justify-end gap-2 border-t border-console-line px-4 py-3">
            <ConsoleButton onClick={() => setOpen(false)}>Cancel</ConsoleButton>
            <ConsoleButton type="submit" variant="primary" disabled={pending || !chosen}>{pending ? "Booking…" : "Book"}</ConsoleButton>
          </div>
        </form>
      </ConsoleDialog>
    </>
  );
}
