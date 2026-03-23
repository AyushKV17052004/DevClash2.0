import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/**
 * @param {{ activeView: string; onViewChange: (id: string) => void; isCollapsed: boolean; onToggle: () => void; theme?: 'dark' | 'light' }} props
 */
export function Sidebar({ activeView, onViewChange, isCollapsed, onToggle, theme = "dark" }) {
  const isLight = theme === "light";

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "subjects", label: "Subjects", icon: BookOpen },
    { id: "progress", label: "Progress", icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const asideShell = isLight
    ? "bg-white border-slate-200 shadow-sm"
    : "bg-[#0f0f1a] border-white/10";

  const inactiveItem = isLight
    ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
    : "text-gray-400 hover:text-white hover:bg-white/5";

  const activeItem = isLight
    ? "bg-gradient-to-r from-purple-500/15 to-blue-500/15 text-slate-900 border border-purple-400/30"
    : "bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white";

  const toggleBtn = isLight
    ? "bg-white border-slate-200 hover:bg-slate-50"
    : "bg-[#1a1a2e] border-white/10 hover:bg-white/5";

  return (
    <aside
      className={`
        relative border-r transition-all duration-300 flex flex-col
        ${asideShell}
        ${isCollapsed ? "w-16" : "w-64"}
      `}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`absolute top-20 -right-3 w-6 h-6 border rounded-full flex items-center justify-center transition-colors ${toggleBtn}`}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className={`w-4 h-4 ${isLight ? "text-slate-600" : "text-gray-400"}`} />
        ) : (
          <ChevronLeft className={`w-4 h-4 ${isLight ? "text-slate-600" : "text-gray-400"}`} />
        )}
      </button>

      <div className="flex-1 py-6 px-3 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 border border-transparent
                ${isActive ? activeItem : inactiveItem}
              `}
            >
              <Icon
                className={`w-5 h-5 ${isActive ? (isLight ? "text-purple-600" : "text-purple-400") : ""}`}
              />
              {!isCollapsed && <span className="text-sm">{item.label}</span>}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
