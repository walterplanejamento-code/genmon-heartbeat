import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";

interface AlertBadgeProps {
  level: "info" | "warning" | "critical";
  message: string;
  timestamp?: string;
  source?: "rule" | "ai";
  className?: string;
}

export function AlertBadge({
  level,
  message,
  timestamp,
  source,
  className,
}: AlertBadgeProps) {
  const levelStyles = {
    info: "alert-info",
    warning: "alert-warning",
    critical: "alert-critical",
  };

  const icons = {
    info: <Info className="w-4 h-4 text-data-blue" />,
    warning: <AlertTriangle className="w-4 h-4 text-data-amber" />,
    critical: <AlertCircle className="w-4 h-4 text-data-red" />,
  };

  return (
    <div
      className={cn(
        "industrial-card p-3",
        levelStyles[level],
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icons[level]}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground">{message}</p>
          <div className="flex items-center gap-2 mt-1">
            {timestamp && (
              <span className="text-xs text-muted-foreground font-mono">
                {timestamp}
              </span>
            )}
            {source && (
              <span className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                source === "ai" 
                  ? "bg-primary/20 text-primary" 
                  : "bg-secondary text-secondary-foreground"
              )}>
                {source === "ai" ? "IA" : "Regra"}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
