import {
  BarChart3,
  CalendarDays,
  CalendarPlus,
  CreditCard,
  FolderOpen,
  Home,
  ListOrdered,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { TabIcon as TabIconName } from "../_data";

const ICONS: Record<TabIconName, LucideIcon> = {
  home: Home,
  queue: ListOrdered,
  patients: Users,
  pos: CreditCard,
  reports: BarChart3,
  records: FolderOpen,
  calendar: CalendarDays,
  wallet: Wallet,
  person: User,
  book: CalendarPlus,
};

export function TabIcon({ name }: { name: TabIconName }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className="size-5" strokeWidth={1.7} />;
}
