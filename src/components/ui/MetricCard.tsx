import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: "normal" | "warning" | "critical";
  icon?: ReactNode;
  trend?: "up" | "down" | "stable";
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  status = "normal",
  icon,
  className,
}: MetricCardProps) {
  const statusColors = {
    normal: "text-data-cyan",
    warning: "text-data-amber",
    critical: "text-data-red",
  };

  const statusGlow = {
    normal: "",
    warning: "glow-amber",
    critical: "glow-red",
  };

  return (
    <div className={cn("industrial-card group hover:border-primary/50 transition-all duration-300", className)}>
      <div className="flex items-start justify-between mb-2">
        <span className="data-label">{label}</span>
        {icon && (
          <div className="text-muted-foreground group-hover:text-primary transition-colors">
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span className={cn("data-value", statusColors[status], statusGlow[status])}>
          {value}
        </span>
        {unit && (
          <span className="text-sm text-muted-foreground font-mono">{unit}</span>
        )}
      </div>
    </div>
  );
}
