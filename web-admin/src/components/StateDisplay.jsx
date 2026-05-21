import { CircleNotch } from "@phosphor-icons/react";

/**
 * Loading spinner centered in a container.
 * @param {string} [className] – Custom padding/sizing (default: "py-20")
 */
export function LoadingState({ className = "py-20" }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <CircleNotch className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Empty state with icon and message inside a dashed border box.
 * @param {React.ElementType} icon    – Phosphor icon component
 * @param {string}            message – Text to display
 * @param {string}            [className] – Extra wrapper classes
 */
export function EmptyState({ icon: Icon, message, className = "" }) {
  return (
    <div className={`flex min-h-[30vh] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border ${className}`}>
      {Icon && <Icon className="size-10 text-muted-foreground" />}
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
