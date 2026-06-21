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
          hideTimer = setTimeout(() => setVisible(false), 4000);
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
      className="fixed inset-0 z-[10000] flex items-end justify-center pointer-events-none pb-8 px-6"
      aria-live="polite"
    >
      <div
        style={{
          background: "#1B2540",
          border: "3px solid #C0392B",
          borderRadius: "4px",
          boxShadow: "5px 5px 0px #C0392B",
          padding: "1rem 1.5rem",
          maxWidth: "36rem",
          width: "100%",
        }}
        className="pointer-events-auto flex items-start gap-4"
      >
        <span className="text-2xl select-none shrink-0 mt-0.5">📖</span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#C0392B] mb-1">
            Daily Inspiration
          </p>
          <p className="text-sm text-white font-medium leading-relaxed">{quote}</p>
        </div>
      </div>
    </div>
  );
}
