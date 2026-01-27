import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Settings,
  Cpu,
  Server,
  AlertTriangle,
  FileText,
  LogOut,
  Zap,
  Activity,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Gerador", href: "/generator", icon: Zap },
  { name: "Equipamento HF", href: "/hf-equipment", icon: Cpu },
  { name: "VPS", href: "/vps", icon: Server },
  { name: "Diagnóstico", href: "/diagnostics", icon: Activity },
  { name: "Alertas", href: "/alerts", icon: AlertTriangle },
  { name: "Manuais", href: "/manuals", icon: FileText },
  { name: "Configurações", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">GenMonitor</h1>
            <p className="text-xs text-muted-foreground">Sistema IOT</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border">
          <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-data-red transition-all duration-200">
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
