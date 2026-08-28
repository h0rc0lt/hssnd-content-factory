import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Image as ImageIcon,
  Workflow,
  CalendarDays,
  CheckSquare,
  BarChart3,
  Settings,
} from "lucide-react";

export interface NavConfigItem {
  label: string;
  href?: string;
  icon: LucideIcon;
  /** Phase 2A ships Dashboard + Characters. Every other module in the
   *  product IA is listed (so the shell reflects the real information
   *  architecture) but rendered disabled with a "Soon" marker until its
   *  own phase lands — never a dead link pretending to work. */
  implemented: boolean;
}

export const NAV_ITEMS: NavConfigItem[] = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard, implemented: true },
  { label: "Characters", href: "/characters", icon: Users, implemented: true },
  { label: "Media Library", href: "/media-library", icon: ImageIcon, implemented: true },
  { label: "Workflow Center", icon: Workflow, implemented: false },
  { label: "Content Calendar", icon: CalendarDays, implemented: false },
  { label: "Approval Queue", icon: CheckSquare, implemented: false },
  { label: "Analytics", icon: BarChart3, implemented: false },
  { label: "Settings", icon: Settings, implemented: false },
];
