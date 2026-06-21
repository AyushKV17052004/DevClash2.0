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

export function Navbar({ activeFeature, onFeatureSelect, theme = "dark", user, onLogout }) {
  const isLight = theme === "light";

  const features = [
    { id: "planner",    label: "Study Planner",    icon: Calendar },
    { id: "repetition", label: "Spaced Repetition", icon: Brain },
    { id: "tutor",      label: "Doubt Solver",      icon: MessageSquare },
    { id: "practice",   label: "Adaptive Practice", icon: Target },
    { id: "summarizer", label: "Video Summarizer",  icon: Video },
  ];

  const navShell = isLight
    ? "bg-[#F8F4EE] border-[#1B2540]/15 shadow-sm"
    : "bg-[#0B1018] border-white/10";

  const brand = isLight ? "text-[#1B2540]" : "text-[#EDE8E1]";

  const inactiveBtn = isLight
    ? "text-[#1B2540]/60 hover:text-[#1B2540] hover:bg-[#1B2540]/8 border-transparent"
    : "text-[#EDE8E1]/50 hover:text-[#EDE8E1] hover:bg-white/5 border-transparent";

  const activeBtn = isLight
    ? "bg-[#C0392B] text-white border-[#C0392B]"
    : "bg-[#C0392B] text-white border-[#C0392B]";

  return (
    <nav className={`border-b px-6 py-3 ${navShell}`}>
      <div className="flex items-center justify-between max-w-[1800px] mx-auto gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <div
            className="w-9 h-9 flex items-center justify-center shrink-0"
            style={{
              background: "#C0392B",
              borderRadius: "4px",
            }}
          >
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <h1
            className={`text-lg font-black tracking-tight ${brand} truncate`}
            style={{ fontFamily: "'Merriweather', Georgia, serif" }}
          >
            StudyAI
          </h1>
          <span
            className={`hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${
              isLight ? "bg-[#1B2540] text-white" : "bg-[#C0392B] text-white"
            }`}
          >
            JEE · NEET · UPSC
          </span>
        </div>

        {/* Nav items */}
        <div className="flex gap-1 flex-wrap justify-end items-center">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isActive = activeFeature === feature.id;
            return (
              <button
                key={feature.id}
                type="button"
                onClick={() => onFeatureSelect(feature.id)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-sm text-sm font-medium
                  border transition-all duration-150
                  ${isActive ? activeBtn : inactiveBtn}
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden md:inline">{feature.label}</span>
              </button>
            );
          })}

          {user && onLogout && (
            <div className="relative group ml-2">
              <button
                type="button"
                className={`
                  flex items-center justify-center w-9 h-9 rounded-sm border font-bold text-sm
                  transition-colors shrink-0
                  ${isLight
                    ? "border-[#1B2540]/20 bg-[#1B2540] text-white hover:bg-[#C0392B] hover:border-[#C0392B]"
                    : "border-white/15 bg-white/8 text-[#EDE8E1] hover:bg-[#C0392B] hover:border-[#C0392B]"
                  }
                `}
                aria-haspopup="true"
                aria-label="Account menu"
              >
                <User className="w-4 h-4" />
              </button>
              <div className="absolute right-0 top-full pt-1 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div
                  className={`rounded-sm border shadow-xl py-1 ${
                    isLight
                      ? "bg-[#F8F4EE] border-[#1B2540]/20"
                      : "bg-[#16202F] border-white/10"
                  }`}
                >
                  <p
                    className={`px-3 py-2 text-xs truncate border-b font-medium ${
                      isLight
                        ? "text-[#1B2540]/60 border-[#1B2540]/10"
                        : "text-[#EDE8E1]/50 border-white/10"
                    }`}
                  >
                    {user.username || user.email || "Account"}
                  </p>
                  <button
                    type="button"
                    onClick={onLogout}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left font-medium ${
                      isLight
                        ? "text-[#C0392B] hover:bg-[#C0392B]/8"
                        : "text-[#E05C4F] hover:bg-[#C0392B]/15"
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
