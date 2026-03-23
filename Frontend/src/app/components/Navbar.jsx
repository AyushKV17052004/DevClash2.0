import {
  Calendar,
  Brain,
  MessageSquare,
  Target,
  Video,
  GraduationCap,
  User,
  LogOut,
} from "lucide-react";

/**
 * @param {{ activeFeature: string; onFeatureSelect: (id: string) => void; theme?: 'dark' | 'light'; user?: { username?: string; email?: string } | null; onLogout?: () => void }} props
 */
export function Navbar({ activeFeature, onFeatureSelect, theme = "dark", user, onLogout }) {
  const isLight = theme === "light";

  const features = [
    { id: "planner", label: "Study Planner", icon: Calendar },
    { id: "repetition", label: "Spaced Repetition", icon: Brain },
    { id: "tutor", label: "AI Tutor", icon: MessageSquare },
    { id: "practice", label: "Adaptive Practice", icon: Target },
    { id: "summarizer", label: "Video Summarizer", icon: Video },
  ];

  const navShell = isLight
    ? "bg-white border-slate-200 shadow-sm"
    : "bg-[#0f0f1a] border-white/10";

  const inactiveBtn = isLight
    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    : "text-gray-400 hover:text-white hover:bg-white/5";

  const activeBtn = isLight
    ? "bg-gradient-to-r from-purple-500/15 to-blue-500/15 text-slate-900 border border-purple-400/40"
    : "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border border-purple-500/30";

  return (
    <nav className={`border-b px-6 py-4 ${navShell}`}>
      <div className="flex items-center justify-between max-w-[1800px] mx-auto gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent truncate">
            LearnAI
          </h1>
        </div>

        <div className="flex gap-2 flex-wrap justify-end items-center">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isActive = activeFeature === feature.id;

            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => onFeatureSelect(feature.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 border border-transparent
                  ${isActive ? activeBtn : inactiveBtn}
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm hidden sm:inline">{feature.label}</span>
              </button>
            );
          })}

          {user && onLogout && (
            <div className="relative group ml-1">
              <button
                type="button"
                className={`flex items-center justify-center w-10 h-10 rounded-full border transition-colors shrink-0 ${
                  isLight
                    ? "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "border-white/15 bg-white/5 text-gray-200 hover:bg-white/10"
                }`}
                aria-haspopup="true"
                aria-label="Account menu"
              >
                <User className="w-5 h-5" />
              </button>
              <div
                className={`absolute right-0 top-full pt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50`}
              >
                <div
                  className={`rounded-lg border shadow-xl py-1 ${
                    isLight ? "bg-white border-slate-200" : "bg-[#1a1a2e] border-white/10"
                  }`}
                >
                  <p
                    className={`px-3 py-2 text-xs truncate border-b ${
                      isLight ? "text-slate-600 border-slate-100" : "text-gray-400 border-white/10"
                    }`}
                  >
                    {user.username || user.email || "Account"}
                  </p>
                  <button
                    type="button"
                    onClick={onLogout}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left ${
                      isLight
                        ? "text-red-600 hover:bg-red-50"
                        : "text-red-400 hover:bg-red-500/10"
                    }`}
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
