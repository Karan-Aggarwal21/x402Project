"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  ArrowLeftRight,
  ShieldCheck,
  Store,
  ScrollText,
  PlayCircle,
  Shield,
} from "lucide-react";

/** OWNER: UI · Navigation. Order matches the demo flow. */
export const NAV = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/approvals", label: "Approvals", icon: ShieldCheck },
  { href: "/merchants", label: "Merchants", icon: Store },
  { href: "/audit", label: "Audit log", icon: ScrollText },
  { href: "/simulator", label: "Simulator", icon: PlayCircle },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-zinc-200 bg-zinc-900 text-zinc-100 flex flex-col shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-zinc-800 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Shield className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
            Spend Guard
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              x402
            </span>
          </div>
          <p className="text-xs text-zinc-400">Autonomous Policy Guard</p>
        </div>
      </div>

      {/* Navigation List */}
      <nav aria-label="Main" className="flex-1 px-3 py-4 space-y-1">
        {NAV.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 font-semibold"
                  : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800 text-xs text-zinc-400 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Network</span>
          <span className="font-mono text-zinc-300">Base Sepolia</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-500">Guard Mode</span>
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Active
          </span>
        </div>
      </div>
    </aside>
  );
}
