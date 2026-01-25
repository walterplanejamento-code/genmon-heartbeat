import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "online" | "offline" | "warning" | "error";
  label?: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

export function StatusIndicator({
  status,
  label,
  size = "md",
  pulse = true,
}: StatusIndicatorProps) {
  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
    lg: "w-4 h-4",
  };

  const statusStyles = {
    online: "bg-data-green shadow-[0_0_10px_hsl(var(--data-green)/0.8)]",
    offline: "bg-muted-foreground",
    warning: "bg-data-amber shadow-[0_0_10px_hsl(var(--data-amber)/0.8)]",
    error: "bg-data-red shadow-[0_0_10px_hsl(var(--data-red)/0.8)]",
  };

  const labelColors = {
    online: "text-data-green",
    offline: "text-muted-foreground",
    warning: "text-data-amber",
    error: "text-data-red",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-full",
          sizeClasses[size],
          statusStyles[status],
          pulse && status !== "offline" && "animate-pulse-glow"
        )}
      />
      {label && (
        <span className={cn("text-sm font-medium", labelColors[status])}>
          {label}
        </span>
      )}
    </div>
  );
}
