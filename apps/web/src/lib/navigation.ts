import { GitBranch, LayoutDashboard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  status?: "ready" | "soon";
};

export const primaryNavigation: NavItem[] = [
  { title: "Overview", href: "/", icon: LayoutDashboard, status: "ready" },
  { title: "Projects", href: "/repositories", icon: GitBranch, status: "ready" }
];
