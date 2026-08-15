"use client";

import { Sidebar } from "@/dashboard/shell/sidebar";
import { Header } from "@/dashboard/shell/header";

/** OWNER: UI · Dashboard layout: sidebar + header. Rendered by app/(dashboard)/layout.tsx */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-zinc-50 text-zinc-900 antialiased font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
