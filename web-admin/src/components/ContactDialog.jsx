import { Envelope as Mail, Phone } from "@phosphor-icons/react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export default function ContactDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Liên hệ với quản trị viên</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <a
            href="mailto:hminh250104@gmail.com"
            className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
          >
            <span className="flex items-center justify-center size-9 rounded-lg bg-primary/10 shrink-0">
              <Mail className="size-4 text-primary" />
            </span>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Email</p>
              <p className="font-semibold">hminh250104@gmail.com</p>
            </div>
          </a>
          <a
            href="tel:+84852325683"
            className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
          >
            <span className="flex items-center justify-center size-9 rounded-lg bg-primary/10 shrink-0">
              <Phone className="size-4 text-primary" />
            </span>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Điện thoại</p>
              <p className="font-semibold">+84 852 325 683</p>
            </div>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
