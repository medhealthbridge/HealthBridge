import { Pill } from "@/src/components/console/pill";
import type { Tone } from "@/src/types/console";
import type { AppointmentStatus } from "@/src/server/services/clinic-app";

const STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  requested: { label: "Requested", tone: "warn" },
  confirmed: { label: "Booked", tone: "info" },
  checked_in: { label: "Waiting", tone: "warn" },
  in_progress: { label: "In chair", tone: "accent" },
  completed: { label: "Done", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "danger" },
  no_show: { label: "No-show", tone: "danger" },
};

export function statusLabel(status: AppointmentStatus) {
  return STATUS[status].label;
}

export function StatusPill({ status }: { status: AppointmentStatus }) {
  return <Pill tone={STATUS[status].tone}>{STATUS[status].label}</Pill>;
}
