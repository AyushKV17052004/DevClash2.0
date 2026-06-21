import { useState } from "react";
import { useDispatch } from "react-redux";
import { LogIn, UserPlus, Loader2, BookOpen } from "lucide-react";
import { setAuth } from "../../redux/authSlice";
import { signup, login } from "../../api/authApi";
import { Toast } from "./Toast";

export function Auth() {
  const dispatch = useDispatch();
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "info" });

  const showToast = (message, type = "info") => {
    setToast({ message, type });
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    const u = username.trim();
    const eVal = email.trim();
    const p = password;
    if (!u || u.length < 2) {
      showToast("Username must be at least 2 characters.", "error");
      return;
    }
    if (!eVal) {
      showToast("Email is required.", "error");
      return;
    }
    if (!p || p.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await signup({ username: u, email: eVal, password: p });
      dispatch(setAuth({ token: data.token, user: data.user }));
      showToast("Account created! Redirecting…", "success");
    } catch (err) {
      const msg = err.message || "Signup failed.";
      if (msg.toLowerCase().includes("already exists") || msg.toLowerCase().includes("already taken")) {
        showToast("User with this email or username already exists.", "error");
      } else {
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const input = emailOrUsername.trim();
    const p = password;
    if (!input || !p) {
      showToast("Email/username and password are required.", "error");
      return;
    }
    setLoading(true);
    try {
      const data = await login({ emailOrUsername: input, password: p });
      dispatch(setAuth({ token: data.token, user: data.user }));
      showToast("Logged in successfully!", "success");
    } catch (err) {
      const msg = err.message || "Login failed.";
      if (msg.toLowerCase().includes("invalid")) {
        showToast("Invalid email/username or password.", "error");
      } else {
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    "w-full border-2 border-[#1B2540]/20 rounded-sm px-4 py-3 text-[#1B2540] bg-white placeholder-[#1B2540]/40 focus:outline-none focus:border-[#C0392B] transition-colors text-sm";
  const labelCls = "block text-xs font-bold uppercase tracking-wider text-[#1B2540]/60 mb-1.5";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 overflow-y-auto"
      style={{ background: "#F8F4EE" }}
    >
      {/* Floating stickers */}
      <div
        className="sticker sticker-slow fixed"
        style={{ top: "8%", left: "6%", fontSize: "4rem", "--sticker-rot": "-15deg" }}
      >📚</div>
      <div
        className="sticker sticker-drift fixed"
        style={{ top: "15%", right: "8%", fontSize: "3rem", "--sticker-rot": "10deg", animationDelay: "1s" }}
      >✏️</div>
      <div
        className="sticker sticker-wobble fixed"
        style={{ bottom: "20%", left: "5%", fontSize: "2.5rem", "--sticker-rot": "-8deg", animationDelay: "0.5s" }}
      >🔬</div>
      <div
        className="sticker fixed"
        style={{ bottom: "10%", right: "7%", fontSize: "3.5rem", "--sticker-rot": "12deg", animationDelay: "1.8s" }}
      >⚗️</div>
      <div
        className="sticker sticker-drift fixed"
        style={{ top: "60%", left: "12%", fontSize: "2rem", "--sticker-rot": "6deg", animationDelay: "0.8s" }}
      >🧮</div>
      <div
        className="sticker sticker-slow fixed"
        style={{ top: "40%", right: "4%", fontSize: "2rem", "--sticker-rot": "-4deg", animationDelay: "2.5s" }}
      >📐</div>

      {/* Brand */}
      <div className="flex items-center gap-3 mb-8 z-10">
        <div
          className="w-12 h-12 flex items-center justify-center"
          style={{ background: "#C0392B", borderRadius: "6px" }}
        >
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1
            className="text-2xl font-black text-[#1B2540] leading-none"
            style={{ fontFamily: "'Merriweather', Georgia, serif" }}
          >
            StudyAI
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#1B2540]/50 mt-0.5">
            JEE · NEET · UPSC
          </p>
        </div>
      </div>

      {/* Panel */}
      <div
        className="w-full max-w-md z-10"
        style={{
          background: "#FFFFFF",
          border: "2px solid #1B2540",
          borderRadius: "6px",
          boxShadow: "6px 6px 0px #1B2540",
          padding: "2rem",
        }}
      >
        {/* Tab switcher */}
        <div
          className="flex gap-0 mb-6"
          style={{ border: "2px solid #1B2540", borderRadius: "4px", overflow: "hidden" }}
        >
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 text-sm font-bold transition-colors ${
              mode === "login"
                ? "bg-[#1B2540] text-white"
                : "bg-white text-[#1B2540] hover:bg-[#1B2540]/5"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2.5 text-sm font-bold border-l-2 border-[#1B2540] transition-colors ${
              mode === "signup"
                ? "bg-[#1B2540] text-white"
                : "bg-white text-[#1B2540] hover:bg-[#1B2540]/5"
            }`}
          >
            Sign up
          </button>
        </div>

        {mode === "signup" ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="signup-username">Username</label>
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputCls}
                placeholder="Choose a username"
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="At least 6 characters"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90 active:translate-y-0.5"
              style={{ background: "#C0392B", borderRadius: "4px" }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Create account
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="login-input">Email or username</label>
              <input
                id="login-input"
                type="text"
                autoComplete="username email"
                value={emailOrUsername}
                onChange={(e) => setEmailOrUsername(e.target.value)}
                className={inputCls}
                placeholder="Email or username"
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="Password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:opacity-90 active:translate-y-0.5"
              style={{ background: "#C0392B", borderRadius: "4px" }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Log in
                </>
              )}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-xs text-[#1B2540]/40">
          Your AI study partner for JEE, NEET &amp; UPSC
        </p>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "info" })}
      />
    </div>
  );
}
