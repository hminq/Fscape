import {
  CheckCircle as CircleCheckIcon,
  Info as InfoIcon,
  CircleNotch as Loader2Icon,
  XCircle as OctagonXIcon,
  Warning as TriangleAlertIcon,
} from "@phosphor-icons/react"
import { Toaster as Sonner } from "sonner";

const Toaster = ({
  ...props
}) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      icons={{
        success: <CircleCheckIcon className="size-4 text-emerald-500" weight="fill" />,
        info: <InfoIcon className="size-4 text-blue-500" weight="fill" />,
        warning: <TriangleAlertIcon className="size-4 text-amber-500" weight="fill" />,
        error: <OctagonXIcon className="size-4 text-red-500" weight="fill" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)"
        }
      }
      {...props} />
  );
}

export { Toaster }
