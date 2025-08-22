import { Image as ImageIcon } from "lucide-react";

/**
 * Variants:
 *  - "bar": clean card row
 *  - "soft": soft gradient card
 *  - "inline": text-only hint
 */
export default function EmptyState({ children, variant = "bar", className = "" }) {
  if (variant === "soft") {
    return (
      <div className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white px-5 py-4 ${className}`}>
        <div className="pointer-events-none absolute -top-8 -right-8 h-24 w-24 rounded-full bg-indigo-50/60" />
        <div className="relative flex items-center gap-3">
          <span className="h-8 w-8 grid place-items-center rounded-full border border-indigo-100 bg-white text-indigo-600 shadow-sm">
            <ImageIcon className="h-4 w-4" />
          </span>
          <div className="text-sm text-slate-700">{children}</div>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <p className={`flex items-center gap-2 text-sm text-slate-500 ${className}`}>
        <ImageIcon className="h-4 w-4 text-indigo-500" />
        {children}
      </p>
    );
  }

  // "bar" (default)
  return (
    <div className={`rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3 shadow-sm ${className}`}>
      <span className="h-8 w-8 grid place-items-center rounded-lg bg-indigo-50 text-indigo-600">
        <ImageIcon className="h-4 w-4" />
      </span>
      <p className="text-sm text-slate-700">{children}</p>
    </div>
  );
}
