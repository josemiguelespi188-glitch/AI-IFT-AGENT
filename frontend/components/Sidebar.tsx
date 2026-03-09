"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Inbox, AlertTriangle, FileText,
  Users, BookOpen, Settings, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/",             label: "Dashboard",    icon: LayoutDashboard },
  { href: "/inquiries",    label: "Inquiries",    icon: Inbox },
  { href: "/escalations",  label: "Escalations",  icon: AlertTriangle },
  { href: "/documents",    label: "Documents",    icon: FileText },
  { href: "/clients",      label: "Clients",      icon: Users },
  { href: "/knowledge",    label: "Knowledge",    icon: BookOpen },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 flex flex-col bg-brand-dark border-r border-brand-border shrink-0">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-accent flex items-center justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-none">Axiskey</p>
            <p className="text-xs text-brand-muted mt-0.5">Industry FinTech</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-brand-accent text-white"
                  : "text-brand-muted hover:text-white hover:bg-brand-card"
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-muted hover:text-white hover:bg-brand-card transition-colors"
        >
          <Settings size={16} />
          Settings
        </Link>
        <div className="mt-3 px-3 py-3 rounded-lg bg-brand-card border border-brand-border">
          <p className="text-xs text-brand-muted">AI Agent</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="w-2 h-2 rounded-full bg-brand-green animate-pulse" />
            <p className="text-xs text-white font-medium">Claude Opus 4.6</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
