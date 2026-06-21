import {
  Calendar,
  MessageSquare,
  Target,
  Video,
  ChevronRight,
  LayoutGrid,
  BookOpen,
  Repeat,
} from "lucide-react";

const FEATURE_CARDS = [
  {
    id: "planner",
    title: "Study Planner",
    description:
      "Build a week-by-week study plan around your exam date and chapter list. Day-by-day guidance tailored to what you still need to cover.",
    icon: Calendar,
    color: "#C0392B",       /* brick red */
    tag: "Plan",
    sticker: "📅",
    stickerRot: "-8deg",
  },
  {
    id: "tutor",
    title: "Doubt Solver",
    description:
      "Ask any doubt in plain language or attach a photo of a problem. Get step-by-step explanations without jargon overload.",
    icon: MessageSquare,
    color: "#1B2540",       /* deep navy */
    tag: "Ask",
    sticker: "💬",
    stickerRot: "10deg",
  },
  {
    id: "practice",
    title: "Adaptive Practice",
    description:
      "Practice questions focused on your weak topics so you spend time where it matters most. JEE · NEET · UPSC PYQ style.",
    icon: Target,
    color: "#1E8449",       /* deep green */
    tag: "Practice",
    sticker: "🎯",
    stickerRot: "-6deg",
  },
  {
    id: "summarizer",
    title: "YT Video Summarizer",
    description:
      "Paste a YouTube link and get a concise summary and key takeaways so you can revise faster without rewatching full videos.",
    icon: Video,
    color: "#E67E22",       /* mustard */
    tag: "Watch",
    sticker: "🎬",
    stickerRot: "12deg",
  },
  {
    id: "repetition",
    title: "Spaced Repetition",
    description:
      "Flashcards powered by the SM-2 algorithm — review at the right intervals to lock concepts into long-term memory.",
    icon: Repeat,
    color: "#2471A3",       /* ink blue */
    tag: "Revise",
    sticker: "🧠",
    stickerRot: "-10deg",
  },
  {
    id: "subjects",
    title: "Subjects & Syllabus",
    description:
      "Browse and generate topic-wise MCQs and mock tests for JEE, NEET, or UPSC. Know exactly where you stand.",
    icon: BookOpen,
    color: "#7D3C98",       /* deep purple */
    tag: "Explore",
    sticker: "📖",
    stickerRot: "8deg",
  },
];

export function Dashboard({ onNavigateToFeature }) {
  const todayLine = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative overflow-hidden">
      {/* Page-level floating stickers */}
      <div
        className="sticker sticker-slow"
        style={{ top: "6%", right: "3%", fontSize: "3rem", "--sticker-rot": "-12deg" }}
      >✏️</div>
      <div
        className="sticker sticker-drift"
        style={{ top: "18%", right: "12%", fontSize: "2rem", "--sticker-rot": "8deg", animationDelay: "1.2s" }}
      >⚗️</div>
      <div
        className="sticker sticker-wobble"
        style={{ bottom: "20%", right: "5%", fontSize: "2.5rem", "--sticker-rot": "-5deg", animationDelay: "0.7s" }}
      >📐</div>
      <div
        className="sticker"
        style={{ top: "55%", right: "18%", fontSize: "1.8rem", "--sticker-rot": "15deg", animationDelay: "2s" }}
      >🧮</div>
      <div
        className="sticker sticker-drift"
        style={{ bottom: "8%", left: "2%", fontSize: "2rem", "--sticker-rot": "-20deg", animationDelay: "0.5s" }}
      >🔬</div>

      <div className="p-8 max-w-6xl mx-auto space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-1 h-10 rounded-full"
              style={{ background: "#C0392B" }}
            />
            <div>
              <h1
                className="text-3xl font-black text-foreground"
                style={{ fontFamily: "'Merriweather', Georgia, serif" }}
              >
                Welcome back
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">{todayLine}</p>
            </div>
          </div>
          <p className="text-muted-foreground ml-4">
            Pick a tool below and keep the momentum going. 💪
          </p>
        </div>

        {/* Quick access label */}
        <div className="flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-muted-foreground" />
          <span
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground"
          >
            Quick access
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURE_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => onNavigateToFeature?.(card.id)}
                className={`
                  group relative text-left border-2 bg-card p-6
                  shadow-sm hover:shadow-md
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C0392B]
                  transition-all duration-150 overflow-hidden
                `}
                style={{
                  borderColor: `${card.color}30`,
                  borderRadius: "6px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = card.color;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `${card.color}30`;
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {/* Floating sticker decoration */}
                <span
                  className="absolute top-3 right-4 text-2xl select-none pointer-events-none transition-transform duration-300 group-hover:scale-125"
                  style={{
                    transform: `rotate(${card.stickerRot})`,
                    opacity: 0.4,
                    display: "block",
                  }}
                >
                  {card.sticker}
                </span>

                {/* Icon block */}
                <div
                  className="flex h-11 w-11 items-center justify-center mb-4"
                  style={{
                    background: card.color,
                    borderRadius: "4px",
                  }}
                >
                  <Icon className="h-5 w-5 text-white" aria-hidden />
                </div>

                {/* Tag pill */}
                <span
                  className="inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 mb-3"
                  style={{
                    background: `${card.color}15`,
                    color: card.color,
                    borderRadius: "2px",
                    border: `1px solid ${card.color}40`,
                  }}
                >
                  {card.tag}
                </span>

                <h2
                  className="text-base font-bold text-foreground mb-2"
                  style={{ fontFamily: "'Merriweather', Georgia, serif" }}
                >
                  {card.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {card.description}
                </p>

                {/* CTA line */}
                <div className="mt-4 flex items-center gap-1">
                  <span
                    className="text-xs font-bold"
                    style={{ color: card.color }}
                  >
                    Open
                  </span>
                  <ChevronRight
                    className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1"
                    style={{ color: card.color }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
