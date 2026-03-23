import { useState, useEffect } from "react";
import { API_BASE } from "../../config/api";

export function DailyQuoteOverlay() {
  const [quote, setQuote] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let hideTimer;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/daily-quote`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (data.quote) {
          setQuote(String(data.quote));
          setVisible(true);
          hideTimer = setTimeout(() => setVisible(false), 3000);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, []);

  if (!quote || !visible) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none px-6"
      aria-live="polite"
    >
      <div className="max-w-lg rounded-2xl border border-purple-500/40 bg-[#12121c]/95 backdrop-blur-md px-8 py-6 shadow-2xl text-center pointer-events-auto">
        <p className="text-xs uppercase tracking-widest text-purple-300/90 mb-2">Daily inspiration</p>
        <p className="text-lg text-white font-medium leading-relaxed">{quote}</p>
      </div>
    </div>
  );
}
