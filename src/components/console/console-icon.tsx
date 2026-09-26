import {
  ArrowDownUp,
  Blocks,
  Building2,
  CalendarClock,
  CreditCard,
  FileCheck2,
  Headset,
  LayoutDashboard,
  MessageSquareText,
  Package,
  PhilippinePeso,
  ScrollText,
  Send,
  Settings,
  Tags,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ConsoleIconName } from "@/src/types/console";

const ICONS: Record<ConsoleIconName, LucideIcon> = {
  overview: LayoutDashboard,
  tenants: Building2,
  billing: PhilippinePeso,
  modules: Blocks,
  support: Headset,
  staff: Users,
  feedback: MessageSquareText,
  audit: ScrollText,
  patients: UserRound,
  appointments: CalendarClock,
  services: Tags,
  inventory: Package,
  claims: FileCheck2,
  reminders: Send,
  subscription: CreditCard,
  "import-export": ArrowDownUp,
  settings: Settings,
};

export function ConsoleIcon({ name, className = "size-4" }: { name: ConsoleIconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className={className} />;
}
