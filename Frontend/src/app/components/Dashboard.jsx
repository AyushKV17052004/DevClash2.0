import {
  Calendar,
  MessageSquare,
  Target,
  Video,
  ChevronRight,
  LayoutGrid,
} from "lucide-react";

const FEATURE_CARDS = [
  {
    id: "planner",
    title: "Study Planner",
    description:
      "Build a weekly study plan around your exam date and chapter list. Get day-by-day guidance tailored to what you still need to cover.",
    icon: Calendar,
    accent: "from-violet-500/90 to-indigo-600/80",
    border: "border-violet-500/25 hover:border-violet-400/40",
  },
  {
    id: "tutor",
    title: "AI Tutor",
    description:
      "Ask any doubt in plain language or attach a photo of a problem. Get step-by-step explanations without jargon overload.",
    icon: MessageSquare,
    accent: "from-fuchsia-500/90 to-purple-600/80",
    border: "border-fuchsia-500/25 hover:border-fuchsia-400/40",
  },
  {
    id: "practice",
    title: "Adaptive Practice",
    description:
      "Practice questions focused on your weak topics from the knowledge graph so you spend time where it matters most.",
    icon: Target,
    accent: "from-emerald-500/90 to-teal-600/80",
    border: "border-emerald-500/25 hover:border-emerald-400/40",
  },
  {
    id: "summarizer",
    title: "YT Video Summarizer",
    description:
      "Paste a YouTube link and get a concise summary and key takeaways so you can revise faster without rewatching full videos.",
    icon: Video,
    accent: "from-amber-500/90 to-orange-600/80",
    border: "border-amber-500/25 hover:border-amber-400/40",
  },
];

/**
 * @param {{ onNavigateToFeature?: (id: string) => void }} props
 */
export function Dashboard({ onNavigateToFeature }) {
  const todayLine = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-semibold text-white mb-2">Welcome back</h1>
        <p className="text-gray-400">
          {todayLine} — pick a tool below to continue learning.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-500">
        <LayoutGrid className="w-4 h-4" />
        <span>Quick access</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {FEATURE_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onNavigateToFeature?.(card.id)}
              className={`
                group text-left rounded-2xl border bg-[#12121c] p-6 shadow-lg transition-all duration-200
                hover:shadow-xl hover:bg-[#16162a] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60
                ${card.border}
              `}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${card.accent} shadow-md`}
                >
                  <Icon className="h-6 w-6 text-white" aria-hidden />
                </div>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-gray-500 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-300"
                  aria-hidden
                />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-white">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                {card.description}
              </p>
              <p className="mt-4 text-xs font-medium text-purple-300/90 group-hover:text-purple-200">
                Open →
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
