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

  const panel =
    "bg-[#1a1a2e] rounded-2xl border border-white/10 p-8 shadow-xl w-full max-w-md";
  const inputCls =
    "w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50";
  const labelCls = "block text-sm text-gray-400 mb-2";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#0a0a12]">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Dev Clash</h1>
      </div>

      <div className={panel}>
        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-lg">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "login"
                ? "bg-purple-500/80 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-purple-500/80 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Sign up
          </button>
        </div>

        {mode === "signup" ? (
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className={labelCls} htmlFor="signup-username">
                Username
              </label>
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
              <label className={labelCls} htmlFor="signup-email">
                Email
              </label>
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
              <label className={labelCls} htmlFor="signup-password">
                Password
              </label>
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
              className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
              <label className={labelCls} htmlFor="login-input">
                Email or username
              </label>
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
              <label className={labelCls} htmlFor="login-password">
                Password
              </label>
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
              className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
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
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: "", type: "info" })}
      />
    </div>
  );
}
