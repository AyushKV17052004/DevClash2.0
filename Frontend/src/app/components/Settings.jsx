import { useState, useEffect } from "react";
import { Moon, Sun, User, Save, Check, SlidersHorizontal, LogOut } from "lucide-react";

const PROFILE_KEY = "learnai-profile";

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return { name: "", email: "", details: "" };
    const p = JSON.parse(raw);
    return {
      name: typeof p.name === "string" ? p.name : "",
      email: typeof p.email === "string" ? p.email : "",
      details: typeof p.details === "string" ? p.details : "",
    };
  } catch {
    return { name: "", email: "", details: "" };
  }
}

/**
 * @param {{ theme: 'dark' | 'light'; onThemeChange: (t: 'dark' | 'light') => void; onLogout?: () => void }} props
 */
export function Settings({ theme, onThemeChange, onLogout }) {
  const isLight = theme === "light";
  const panel = isLight
    ? "bg-white border-slate-200 shadow-sm"
    : "bg-[#1a1a2e] border-white/10 shadow-lg";
  const labelCls = isLight ? "text-slate-600" : "text-gray-400";
  const inputCls = isLight
    ? "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-purple-500/50"
    : "bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-purple-500/50";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const p = loadProfile();
    setName(p.name);
    setEmail(p.email);
    setDetails(p.details);
  }, []);

  const handleSaveProfile = () => {
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({ name: name.trim(), email: email.trim(), details: details.trim() })
    );
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  return (
    <div className={`p-8 max-w-2xl mx-auto space-y-8 ${isLight ? "text-slate-900" : "text-white"}`}>
      <div>
        <h1 className={`text-3xl font-semibold mb-2 ${isLight ? "text-slate-900" : "text-white"}`}>
          Settings
        </h1>
        <p className={labelCls}>Theme and your profile are saved in this browser.</p>
      </div>

      <section className={`rounded-xl border p-6 ${panel}`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLight ? "text-slate-800" : "text-white"}`}>
          <SlidersHorizontal className="w-5 h-5 text-violet-500" />
          Appearance
        </h2>
        <p className={`text-sm mb-4 ${labelCls}`}>Choose dark mode or day (light) mode for the whole app.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onThemeChange?.("dark")}
            className={`
              flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all
              ${
                theme === "dark"
                  ? "border-violet-500/60 bg-violet-500/15 ring-1 ring-violet-500/40"
                  : isLight
                    ? "border-slate-200 bg-slate-50 hover:border-slate-300"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
              }
            `}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-amber-200">
              <Moon className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Dark mode</p>
              <p className={`text-xs mt-0.5 ${labelCls}`}>Easier on the eyes at night</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onThemeChange?.("light")}
            className={`
              flex items-center gap-3 rounded-xl border px-4 py-4 text-left transition-all
              ${
                theme === "light"
                  ? "border-amber-400/70 bg-amber-500/10 ring-1 ring-amber-400/40"
                  : isLight
                    ? "border-slate-200 bg-slate-50 hover:border-slate-300"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
              }
            `}
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-100 text-amber-500">
              <Sun className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium">Day mode</p>
              <p className={`text-xs mt-0.5 ${labelCls}`}>Bright layout for daytime</p>
            </div>
          </button>
        </div>
      </section>

      <section className={`rounded-xl border p-6 ${panel}`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLight ? "text-slate-800" : "text-white"}`}>
          <User className="w-5 h-5 text-purple-400" />
          Your details
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-name" className={`block text-sm mb-1.5 ${labelCls}`}>
              Name
            </label>
            <input
              id="settings-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${inputCls}`}
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="settings-email" className={`block text-sm mb-1.5 ${labelCls}`}>
              Email
            </label>
            <input
              id="settings-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors ${inputCls}`}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="settings-details" className={`block text-sm mb-1.5 ${labelCls}`}>
              Other details
            </label>
            <textarea
              id="settings-details"
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-colors resize-y min-h-[100px] ${inputCls}`}
              placeholder="School, exam goals, notes — anything you want to remember."
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:opacity-95 transition-opacity"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save details
                </>
              )}
            </button>
            {saved && (
              <span className={`text-sm ${isLight ? "text-emerald-700" : "text-emerald-400"}`}>
                Stored locally in your browser.
              </span>
            )}
          </div>
        </div>
      </section>

      {onLogout && (
        <section className={`rounded-xl border p-6 ${panel}`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${isLight ? "text-slate-800" : "text-white"}`}>
            Account
          </h2>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </section>
      )}
    </div>
  );
}
