import { PREVIEW_APPOINTMENT } from "../_data";

type BrandPreviewProps = { clinicName: string; primaryColor: string; secondaryColor: string };

export function BrandPreview({ clinicName, primaryColor, secondaryColor }: BrandPreviewProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-bold">Preview</span>
      <div aria-hidden="true" className="overflow-hidden rounded-xl border border-slate-200">
        <div style={{ background: primaryColor }} className="flex items-center gap-2.5 px-3.5 py-3">
          <span className="size-5.5 shrink-0 rounded-md bg-white/30" />
          <span className="font-display text-sm font-extrabold text-white">
            {clinicName || "Your clinic"}
          </span>
        </div>
        <div style={{ background: secondaryColor }} className="p-3.5">
          <div className="flex flex-col gap-2 rounded-[9px] bg-white p-3">
            <span className="font-display text-[13px] font-extrabold text-slate-900">
              Today&apos;s appointments
            </span>
            <span className="text-xs text-slate-700">
              {PREVIEW_APPOINTMENT.time} · {PREVIEW_APPOINTMENT.patient}
            </span>
            <span
              style={{ background: primaryColor }}
              className="self-start rounded-[7px] px-3 py-1.5 text-[11px] font-bold text-white"
            >
              Check in
            </span>
          </div>
        </div>
      </div>
      <div className="flex gap-3 text-[11px] text-slate-600">
        <span>60% main</span>
        <span>30% secondary</span>
        <span>10% ink</span>
      </div>
    </div>
  );
}
