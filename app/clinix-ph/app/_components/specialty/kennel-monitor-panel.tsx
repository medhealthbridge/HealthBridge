import { KENNELS, KENNELS_OCCUPIED_LABEL } from "@/src/lib/mock-data/clinix-app";
import { Kicker } from "../kicker";

/** Veterinary-only floor widget: who is boarding right now. */
export function KennelMonitorPanel() {
  return (
    <section className="border-t-2 border-slate-200 pt-2.5">
      <div className="mb-2 flex items-baseline gap-2">
        <Kicker>Kennel boarding monitor</Kicker>
        <span className="ml-auto text-[10.5px] font-semibold text-brand">{KENNELS_OCCUPIED_LABEL}</span>
      </div>
      <ul className="grid grid-cols-3 gap-[7px]">
        {KENNELS.map((kennel) => {
          const vacant = kennel.pet === "Vacant";

          return (
            <li
              key={kennel.id}
              className={`flex flex-col gap-0.5 rounded-md border border-slate-200 p-2.5 ${vacant ? "bg-transparent" : "bg-white"}`}
            >
              <span className="text-[9px] font-semibold tracking-[0.1em] text-slate-500 uppercase">{kennel.id}</span>
              <span className={`font-display text-[12.5px] leading-tight font-extrabold ${vacant ? "text-slate-400" : "text-slate-900"}`}>
                {kennel.pet}
              </span>
              <span className="text-[9.5px] text-slate-500">{kennel.note}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
