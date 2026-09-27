import { EYE_PRESCRIPTION, EYE_PRESCRIPTION_DATE, EYE_PRESCRIPTION_PATIENT } from "@/src/lib/mock-data/clinix-app";
import { Kicker } from "../kicker";

/** Eye-care-only widget: the last refraction, as the optometrist reads it. */
export function EyePrescriptionPanel({ caption }: { caption?: string }) {
  return (
    <section className="border-t-2 border-slate-200 pt-2.5">
      <Kicker className="mb-2 block">{caption ?? `Last prescription · ${EYE_PRESCRIPTION_PATIENT}`}</Kicker>
      <table className="w-full border-collapse font-data text-[12.5px] tabular-nums">
        <caption className="sr-only">Refraction values as of {EYE_PRESCRIPTION_DATE}</caption>
        <thead>
          <tr className="text-left text-slate-500">
            <th scope="col" className="border-b border-slate-200 pb-1 font-semibold">Eye</th>
            <th scope="col" className="border-b border-slate-200 pb-1 font-semibold">SPH</th>
            <th scope="col" className="border-b border-slate-200 pb-1 font-semibold">CYL</th>
            <th scope="col" className="border-b border-slate-200 pb-1 font-semibold">AXIS</th>
            <th scope="col" className="border-b border-slate-200 pb-1 font-semibold">ADD</th>
          </tr>
        </thead>
        <tbody className="text-slate-900">
          {EYE_PRESCRIPTION.map((row) => (
            <tr key={row.eye}>
              <th scope="row" className="py-1 text-left font-semibold">{row.eye}</th>
              <td className="py-1">{row.sph}</td>
              <td className="py-1">{row.cyl}</td>
              <td className="py-1">{row.axis}</td>
              <td className="py-1">{row.add}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
