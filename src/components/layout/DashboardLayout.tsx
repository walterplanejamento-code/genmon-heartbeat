import { ReactNode, useState } from "react";
import { Sidebar, MobileHeader } from "./Sidebar";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="min-h-screen bg-background">
      <MobileHeader onToggle={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      <main className="lg:pl-64">
        <div className="p-4 pt-18 lg:p-6 lg:pt-6">{children}</div>
      </main>
    </div>
  );
}
