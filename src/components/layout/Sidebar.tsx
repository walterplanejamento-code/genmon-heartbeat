import { cn } from "@/lib/utils";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
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
  Menu,
  X,
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

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const handleNavClick = () => {
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between px-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold text-sidebar-foreground">GenMonitor</h1>
                <p className="text-xs text-muted-foreground">Sistema IOT</p>
              </div>
            </div>
            <button
              onClick={onToggle}
              className="lg:hidden text-sidebar-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={handleNavClick}
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
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-data-red transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export function MobileHeader({ onToggle }: { onToggle: () => void }) {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 lg:hidden">
      <button onClick={onToggle} className="text-sidebar-foreground">
        <Menu className="w-6 h-6" />
      </button>
      <div className="flex items-center gap-2 ml-3">
        <Zap className="w-5 h-5 text-primary" />
        <span className="font-semibold text-sidebar-foreground">GenMonitor</span>
      </div>
    </header>
  );
}
