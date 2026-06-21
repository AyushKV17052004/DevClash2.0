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

export function Settings({ theme, onThemeChange, onLogout }) {
  const isLight = theme === "light";

  const CARD = {
    border: "2px solid var(--border-hard)",
    borderRadius: "4px",
    background: "var(--card)",
    padding: "1.5rem",
  };

  const HEADING = {
    fontFamily: "'Merriweather', Georgia, serif",
    fontWeight: "700",
  };

  const inputCls = `w-full text-sm px-3 py-2.5 outline-none transition-colors`;
  const inputStyle = {
    background: "var(--input-background)",
    border: "2px solid var(--border-hard)",
    borderRadius: "4px",
    color: "var(--foreground)",
  };

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

  const labelCls = "block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5";

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 rounded-full" style={{ background: "#C0392B" }} />
          <h1 className="text-3xl font-black text-foreground" style={HEADING}>
            Settings
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-4">Theme and your profile are saved in this browser.</p>
      </div>

      {/* Appearance */}
      <section style={CARD}>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2" style={HEADING}>
          <SlidersHorizontal className="w-4 h-4" style={{ color: "#C0392B" }} />
          Appearance
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choose dark mode or day (light) mode for the whole app.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onThemeChange?.("dark")}
            className="flex items-center gap-3 px-4 py-4 text-left transition-all hover:opacity-90"
            style={{
              border: `2px solid ${theme === "dark" ? "#C0392B" : "var(--border-hard)"}`,
              borderRadius: "4px",
              background: theme === "dark" ? "#1B2540" : "var(--muted)",
              boxShadow: theme === "dark" ? "3px 3px 0 #C0392B" : "none",
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center"
              style={{ background: "#0B1018", borderRadius: "4px" }}
            >
              <Moon className="h-5 w-5 text-amber-200" />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: theme === "dark" ? "#fff" : "var(--foreground)" }}>
                Dark mode
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Easier on the eyes at night</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onThemeChange?.("light")}
            className="flex items-center gap-3 px-4 py-4 text-left transition-all hover:opacity-90"
            style={{
              border: `2px solid ${theme === "light" ? "#E67E22" : "var(--border-hard)"}`,
              borderRadius: "4px",
              background: theme === "light" ? "#FEF5E7" : "var(--muted)",
              boxShadow: theme === "light" ? "3px 3px 0 #E67E22" : "none",
            }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center"
              style={{ background: "#FDEBD0", borderRadius: "4px" }}
            >
              <Sun className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Day mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">Bright layout for daytime</p>
            </div>
          </button>
        </div>
      </section>

      {/* Profile */}
      <section style={CARD}>
        <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2" style={HEADING}>
          <User className="w-4 h-4" style={{ color: "#1B2540" }} />
          Your details
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="settings-name" className={labelCls}>Name</label>
            <input
              id="settings-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="Your name"
            />
          </div>
          <div>
            <label htmlFor="settings-email" className={labelCls}>Email</label>
            <input
              id="settings-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              style={inputStyle}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="settings-details" className={labelCls}>Other details</label>
            <textarea
              id="settings-details"
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className={`${inputCls} resize-y min-h-[100px]`}
              style={inputStyle}
              placeholder="School, exam goals, notes — anything you want to remember."
            />
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleSaveProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:translate-y-0.5"
              style={{ background: "#1B2540", borderRadius: "4px" }}
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
              <span className="text-sm font-medium" style={{ color: "#1E8449" }}>
                ✓ Stored locally in your browser.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Account */}
      {onLogout && (
        <section style={CARD}>
          <h2 className="text-base font-bold text-foreground mb-4" style={HEADING}>
            Account
          </h2>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold transition-all hover:opacity-90"
            style={{
              border: "2px solid #C0392B",
              borderRadius: "4px",
              color: "#C0392B",
              background: "transparent",
            }}
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </section>
      )}
    </div>
  );
}
