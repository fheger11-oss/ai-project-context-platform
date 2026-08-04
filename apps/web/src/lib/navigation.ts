import {
  Boxes,
  Braces,
  Cable,
  DatabaseZap,
  LayoutDashboard,
  LockKeyhole,
  Settings2
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  status?: "ready" | "soon";
};

export const primaryNavigation: NavItem[] = [
  { title: "Foundation", href: "/", icon: LayoutDashboard, status: "ready" },
  { title: "Engines", href: "/engines", icon: Boxes, status: "soon" },
  { title: "Context Vault", href: "/context", icon: DatabaseZap, status: "soon" },
  { title: "Contracts", href: "/contracts", icon: Braces, status: "soon" },
  { title: "Integrations", href: "/integrations", icon: Cable, status: "soon" },
  { title: "Auth", href: "/auth", icon: LockKeyhole, status: "soon" },
  { title: "Settings", href: "/settings", icon: Settings2, status: "soon" }
];
