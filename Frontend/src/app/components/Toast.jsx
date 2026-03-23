import { useEffect } from "react";

/**
 * Simple toast — pass message, type ('error'|'success'|'info'), onClose after duration.
 */
export function Toast({ message, type = "info", onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message || !onClose) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [message, onClose, duration]);

  if (!message) return null;

  const bg =
    type === "error"
      ? "bg-red-500/95 text-white"
      : type === "success"
        ? "bg-emerald-500/95 text-white"
        : "bg-slate-700/95 text-white";

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-3 rounded-lg shadow-lg ${bg} text-sm font-medium`}
      role="alert"
    >
      {message}
    </div>
  );
}
