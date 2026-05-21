/**
 * Section header with icon box + title + optional count + optional right content.
 * @param {React.ElementType} icon       – Phosphor icon component
 * @param {string}            title      – Section title
 * @param {string|number}     [count]    – Optional count/badge text
 * @param {string}            [countUnit] – Unit after count (e.g. "kết quả")
 * @param {React.ReactNode}   [children] – Right-side content (e.g. Pagination)
 */
export default function SectionHeader({ icon: Icon, title, count, countUnit = "", children }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2.5">
        <div className="size-7 rounded-lg bg-primary/8 flex items-center justify-center">
          <Icon className="size-3.5 text-primary" />
        </div>
        {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
        {count != null && (
          <span className="text-sm font-medium text-muted-foreground">
            {count} {countUnit}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
