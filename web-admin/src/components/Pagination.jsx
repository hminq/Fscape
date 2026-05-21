import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

/**
 * Reusable pagination controls.
 * @param {number}   page        – Current page (1-indexed for display)
 * @param {number}   totalPages  – Total number of pages
 * @param {function} onPrev      – Called when user clicks previous
 * @param {function} onNext      – Called when user clicks next
 * @param {string}   [className] – Extra wrapper classes
 */
export default function Pagination({ page, totalPages, onPrev, onNext, className = "" }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <span className="text-sm font-medium text-muted-foreground">
        {page}/{totalPages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          size="icon"
          variant="outline"
          className="size-8"
          disabled={page <= 1}
          onClick={onPrev}
        >
          <CaretLeft className="size-4" />
        </Button>
        <Button
          size="icon"
          variant="outline"
          className="size-8"
          disabled={page >= totalPages}
          onClick={onNext}
        >
          <CaretRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
