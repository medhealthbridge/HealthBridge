import type { ViewName } from "./names";
import admin_overview from "./admin-overview";
import admin_patients from "./admin-patients";
import admin_appointments from "./admin-appointments";
import admin_billing from "./admin-billing";
import admin_inventory from "./admin-inventory";
import admin_claims from "./admin-claims";
import admin_recalls from "./admin-recalls";
import admin_services from "./admin-services";
import admin_staff from "./admin-staff";
import admin_activity from "./admin-activity";
import admin_reminders from "./admin-reminders";
import app_today from "./app-today";
import app_queue from "./app-queue";
import app_patients from "./app-patients";
import app_appointments from "./app-appointments";
import app_billing from "./app-billing";
import app_inventory from "./app-inventory";
import app_claims from "./app-claims";
import app_recalls from "./app-recalls";

type ViewProps = { params: Promise<Record<string, string>>; searchParams: Promise<Record<string, string>> };

/** The cached pages and the code that renders each. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const VIEWS: Record<ViewName, (props: ViewProps) => Promise<any>> = {
  "admin/overview": admin_overview as never,
  "admin/patients": admin_patients as never,
  "admin/appointments": admin_appointments as never,
  "admin/billing": admin_billing as never,
  "admin/inventory": admin_inventory as never,
  "admin/claims": admin_claims as never,
  "admin/recalls": admin_recalls as never,
  "admin/services": admin_services as never,
  "admin/staff": admin_staff as never,
  "admin/activity": admin_activity as never,
  "admin/reminders": admin_reminders as never,
  "app/today": app_today as never,
  "app/queue": app_queue as never,
  "app/patients": app_patients as never,
  "app/appointments": app_appointments as never,
  "app/billing": app_billing as never,
  "app/inventory": app_inventory as never,
  "app/claims": app_claims as never,
  "app/recalls": app_recalls as never,
};
