import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export function Sidebar({ activeView, onViewChange, isCollapsed, onToggle, theme = "dark" }) {
  const isLight = theme === "light";

  const menuItems = [
    { id: "dashboard", label: "Dashboard",  icon: LayoutDashboard },
    { id: "subjects",  label: "Subjects",   icon: BookOpen },
    { id: "progress",  label: "Progress",   icon: TrendingUp },
    { id: "settings",  label: "Settings",   icon: Settings },
  ];

  const asideShell = isLight
    ? "bg-[#1B2540] border-[#1B2540]"
    : "bg-[#0B1018] border-white/8";

  const inactiveItem =
    "text-white/55 hover:text-white hover:bg-white/8 border-l-2 border-transparent";

  const activeItem =
    "text-white bg-white/10 border-l-2 border-[#C0392B]";

  const toggleBtn = isLight
    ? "bg-[#1B2540] border-white/20 hover:bg-[#C0392B]"
    : "bg-[#16202F] border-white/10 hover:bg-[#C0392B]";

  return (
    <aside
      className={`
        relative border-r transition-all duration-300 flex flex-col
        ${asideShell}
        ${isCollapsed ? "w-14" : "w-56"}
      `}
    >
      <button
        type="button"
        onClick={onToggle}
        className={`absolute top-20 -right-3 w-6 h-6 border rounded-sm flex items-center justify-center transition-colors z-10 ${toggleBtn}`}
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5 text-white" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5 text-white" />
        )}
      </button>

      <div className="flex-1 py-5 px-2 space-y-0.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onViewChange(item.id)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium
                transition-all duration-150
                ${isActive ? activeItem : inactiveItem}
              `}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-[#C0392B]" : ""}`} />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Stickers on sidebar */}
      {!isCollapsed && (
        <div className="py-6 px-3 text-center select-none">
          <p className="text-white/20 text-[10px] uppercase tracking-widest font-bold">
            Keep going 📚
          </p>
        </div>
      )}
    </aside>
  );
}
