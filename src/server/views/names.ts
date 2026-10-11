/** Every page whose content is cached on the client by TanStack Query (see src/components/query/cached-view.tsx). */
export const VIEW_NAMES = [
  "admin/overview", "admin/patients", "admin/appointments", "admin/billing", "admin/inventory", "admin/claims",
  "admin/recalls", "admin/services", "admin/staff", "admin/activity", "admin/reminders",
  "app/today", "app/queue", "app/patients", "app/appointments", "app/billing", "app/inventory", "app/claims", "app/recalls",
] as const;
export type ViewName = (typeof VIEW_NAMES)[number];
export const isViewName = (value: string): value is ViewName => (VIEW_NAMES as readonly string[]).includes(value);
