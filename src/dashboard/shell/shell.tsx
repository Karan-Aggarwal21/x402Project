/** OWNER: UI · Dashboard layout: sidebar + header. Rendered by app/(dashboard)/layout.tsx */
import { Sidebar } from "@/dashboard/shell/sidebar";
import { Header } from "@/dashboard/shell/header";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

