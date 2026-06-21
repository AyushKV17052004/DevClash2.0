import { useState, useMemo, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  GraduationCap,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Layers,
  Save,
  Check,
  CheckCircle2,
  Trophy,
} from "lucide-react";
import { syncPlannerWeakTopics, replacePlannerWeakTopics, removeCompletedTopics } from "../../redux/knowledgeGraphSlice";
import { saveUserProfile } from "../../api/userApi";
import { store } from "../../redux/store";
import { API_BASE } from "../../config/api";
import { setStudyPlannerState } from "../../redux/persistedSlice";
import { AILoader } from "./AILoader";

const STATUS_OPTIONS = ["Completed", "Weak", "Not Started"];
const EXAM_OPTIONS = ["JEE Main", "JEE Advanced", "NEET", "UPSC CSE", "Other"];

const STATUS_STYLE = {
  Completed: { bg: "#1E8449", label: "✓ Completed" },
  Weak:      { bg: "#E67E22", label: "⚠ Weak" },
  "Not Started": { bg: "#1B2540", label: "○ Not Started" },
};

function parsePlanDays(raw) {
  if (!raw?.trim()) return { days: [], finalTips: "", fallback: "" };
  let text = raw.trim();
  let finalTips = "";
  
  // Split out final tips first
  const tipsSplit = text.split(/(?:^|\n)\s*(?:Final\s*Tips|Tips)\s*:\s*/i);
  if (tipsSplit.length > 1) {
    finalTips = tipsSplit.slice(1).join("").trim();
    text = tipsSplit[0].trim();
  }
  
  // Split chunks by "Day X" lookahead (not anchored to line start)
  const chunks = text
    .split(/(?=Day\s*\d+)/i)
    .map((s) => s.trim())
    .filter(Boolean);
    
  const days = [];
  for (const chunk of chunks) {
    // Match Day number and the rest of content
    const m = chunk.match(/Day\s*(\d+)\s*:?\s*\*?\n?([\s\S]*)$/i);
    if (m) {
      let content = String(m[2] ?? "").trim();
      // Clean up any trailing markdown headers or dividers
      content = content.replace(/[\s#*-]+$/, "").trim();
      days.push({ day: Number(m[1]), content });
    }
  }
  
  if (days.length === 0) return { days: [], finalTips, fallback: text };
  days.sort((a, b) => a.day - b.day);
  return { days, finalTips, fallback: "" };
}

function formatDayContent(content) {
  if (!content) return null;
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  return lines.map((line, i) => {
    const trimmed = line.trim();
    const isBullet = /^[-•*]\s/.test(trimmed) || /^\d+[.)]\s/.test(trimmed);
    return (
      <p
        key={i}
        className={`text-sm leading-relaxed ${isBullet ? "pl-3 border-l-2 ml-1" : ""}`}
        style={{
          color: "var(--foreground)",
          borderColor: isBullet ? "#C0392B" : "transparent",
        }}
      >
        {trimmed}
      </p>
    );
  });
}

function DayCardStack({ days, finalTips }) {
  const [active, setActive] = useState(0);
  const [dismissedDays, setDismissedDays] = useState([]);
  const [swipingIdx, setSwipingIdx] = useState(null);
  const total = days.length;

  const remaining = days.filter((_, idx) => !dismissedDays.includes(idx));

  const goNext = () => {
    if (swipingIdx !== null) return;
    setSwipingIdx(active);
    
    setTimeout(() => {
      setDismissedDays((prev) => {
        const nextDismissed = [...prev, active];
        const nextRemaining = days.filter((_, idx) => !nextDismissed.includes(idx));
        if (nextRemaining.length > 0) {
          setActive(days.indexOf(nextRemaining[0]));
        } else {
          setActive(-1);
        }
        return nextDismissed;
      });
      setSwipingIdx(null);
    }, 500); // match keyframes duration
  };

  const goPrev = () => {
    if (swipingIdx !== null) return;
    if (dismissedDays.length > 0) {
      const lastDismissed = dismissedDays[dismissedDays.length - 1];
      setDismissedDays((prev) => prev.slice(0, -1));
      setActive(lastDismissed);
    }
  };

  const jumpToDay = (i) => {
    if (swipingIdx !== null) return;
    setDismissedDays(() => {
      const nextDismissed = [];
      for (let idx = 0; idx < i; idx++) {
        nextDismissed.push(idx);
      }
      return nextDismissed;
    });
    setActive(i);
  };

  if (total === 0) return null;

  const SECTION_HEADING = {
    fontFamily: "'Merriweather', Georgia, serif",
    fontWeight: "700",
  };

  return (
    <div className="space-y-8">
      {/* Injected style block for self-contained 3D swiping keyframes */}
      <style>{`
        @keyframes swipeLeftAndBack {
          0% {
            transform: translate(0, 0) rotate(0deg) scale(1);
            opacity: 1;
            z-index: 20;
          }
          40% {
            transform: translate(-120%, -20px) rotate(-18deg) scale(0.95);
            opacity: 0.8;
            z-index: 20;
          }
          41% {
            transform: translate(-120%, -20px) rotate(-18deg) scale(0.95);
            opacity: 0;
            z-index: 1;
          }
          100% {
            transform: translate(0, 60px) rotate(3deg) scale(0.8);
            opacity: 0;
            z-index: 1;
          }
        }
        .card-swipe-anim {
          animation: swipeLeftAndBack 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
        }
      `}</style>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-1 h-7 rounded-full" style={{ background: "#C0392B" }} />
          <Layers className="w-5 h-5" style={{ color: "#C0392B" }} />
          <h3 className="text-base font-bold text-foreground" style={SECTION_HEADING}>
            Your 7-day plan
          </h3>
        </div>
        
        {remaining.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={goPrev}
              disabled={swipingIdx !== null || dismissedDays.length === 0}
              className="p-2 text-foreground hover:bg-[#C0392B]/10 transition-colors disabled:opacity-50"
              style={{ border: "2px solid var(--border-hard)", borderRadius: "4px" }}
              aria-label="Previous day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-bold tabular-nums min-w-[5rem] text-center" style={{ color: "#C0392B" }}>
              Day {days[active]?.day} · {active + 1}/{total}
            </span>
            <button
              type="button"
              onClick={goNext}
              disabled={swipingIdx !== null}
              className="p-2 text-foreground hover:bg-[#C0392B]/10 transition-colors disabled:opacity-50"
              style={{ border: "2px solid var(--border-hard)", borderRadius: "4px" }}
              aria-label="Next day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3D stacked deck of cards container */}
      <div className="relative mx-auto w-full max-w-3xl h-[420px] mb-8 animate-fade-in" style={{ perspective: "1000px" }}>
        {remaining.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center p-8 text-center"
            style={{
              border: "2px dashed #1E8449",
              borderRadius: "4px",
              background: "var(--card)",
              height: "360px",
              boxShadow: "6px 6px 0 var(--border-hard)",
            }}
          >
            <Trophy className="w-16 h-16 text-[#F4D03F] mb-4 animate-bounce" />
            <h3 className="text-xl font-black text-foreground uppercase tracking-widest mb-2" style={SECTION_HEADING}>
              All Days Completed! 🎉
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              You've successfully swiped through all study days for this week. Keep up the amazing work!
            </p>
            <button
              type="button"
              onClick={() => {
                setDismissedDays([]);
                setActive(0);
              }}
              className="px-6 py-2.5 text-white font-bold text-sm transition-all"
              style={{ background: "#C0392B", borderRadius: "4px" }}
            >
              Reset Week Stack
            </button>
          </div>
        ) : (
          days.map((d, i) => {
            const isDismissed = dismissedDays.includes(i);
            if (isDismissed && swipingIdx !== i) return null;

            const remainingIdx = remaining.findIndex((r) => r.day === d.day);
            const stackPos = swipingIdx === i ? 0 : remainingIdx;
            if (stackPos === -1) return null;

            const isTop = stackPos === 0;
            const z = total - stackPos;
            const translateY = stackPos * 12;
            const scale = 1 - stackPos * 0.035;
            const opacity = stackPos > 4 ? 0 : 1 - stackPos * 0.16;
            
            const rotationAngle = isTop 
              ? 0 
              : (i % 2 === 0 ? 1 : -1) * Math.min(3, stackPos) * 1.5;

            const isCurrentlySwiping = swipingIdx === i;

            return (
              <div
                key={`${d.day}-${i}`}
                className={`absolute left-0 right-0 top-0 mx-auto w-full overflow-hidden transition-all duration-300 ease-out ${
                  isCurrentlySwiping ? "card-swipe-anim" : ""
                }`}
                style={{
                  zIndex: isCurrentlySwiping ? 20 : z,
                  transform: isCurrentlySwiping 
                    ? undefined 
                    : `translateY(${translateY}px) scale(${scale}) rotate(${rotationAngle}deg)`,
                  opacity: isCurrentlySwiping ? undefined : opacity,
                  pointerEvents: isTop && swipingIdx === null ? "auto" : "none",
                  border: isTop ? "2px solid #C0392B" : "2px solid var(--border-hard)",
                  borderRadius: "4px",
                  background: "var(--card)",
                  boxShadow: isTop ? "6px 6px 0 var(--border-hard)" : "2px 2px 0 var(--border-hard)",
                  height: "360px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  className="px-6 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0"
                  style={{
                    background: isTop ? "#C0392B" : "var(--muted)",
                    borderBottom: "2px solid var(--border-hard)",
                  }}
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: isTop ? "rgba(255,255,255,0.7)" : "var(--muted-foreground)" }}>
                      Study day
                    </p>
                    <h4 className="text-lg font-black" style={{ fontFamily: "'Merriweather', Georgia, serif", color: isTop ? "#fff" : "var(--foreground)" }}>
                      Day {d.day}
                    </h4>
                  </div>
                  {isTop && (
                    <button
                      type="button"
                      onClick={goNext}
                      className="text-xs font-black uppercase tracking-wider px-3 py-1 hover:bg-white/10 rounded transition-colors text-white"
                      style={{ border: "1.5px solid rgba(255,255,255,0.4)" }}
                    >
                      Next Day →
                    </button>
                  )}
                </div>
                <div className="px-6 py-5 flex-1 overflow-y-auto space-y-3">
                  {formatDayContent(d.content)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-center gap-1.5 flex-wrap mt-4">
        {days.map((d, i) => (
          <button
            key={d.day}
            type="button"
            onClick={() => jumpToDay(i)}
            disabled={swipingIdx !== null}
            className="h-2 transition-all disabled:opacity-50"
            style={{
              width: i === active ? "2rem" : "0.5rem",
              background: i === active ? "#C0392B" : "var(--border-hard)",
              opacity: i === active ? 1 : 0.3,
              borderRadius: "2px",
            }}
            aria-label={`Go to day ${d.day}`}
          />
        ))}
      </div>

      {finalTips && (
        <div
          className="p-6 mt-6"
          style={{
            border: "2px solid #E67E22",
            borderRadius: "4px",
            background: "var(--card)",
            boxShadow: "4px 4px 0 #E67E22",
          }}
        >
          <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#E67E22" }}>
            📌 Final tips
          </p>
          <div className="space-y-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {finalTips}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = "w-full text-sm px-3 py-2.5 outline-none text-foreground focus:border-[#C0392B]";
const inputStyle = {
  background: "var(--input-background)",
  border: "2px solid var(--border-hard)",
  borderRadius: "4px",
};

export function StudyPlanner() {
  const dispatch = useDispatch();
  const savedPlannerWeakTopics = useSelector((state) => state.knowledge?.plannerWeakTopics ?? []);
  const initializedFromSave = useRef(false);

  const examType = useSelector((state) => state.persisted?.studyPlanExamType || "JEE Main");
  const examDate = useSelector((state) => state.persisted?.studyPlanExamDate || "");
  const chapters = useSelector((state) => state.persisted?.studyPlanChapters || [{ id: "1", name: "", status: "Not Started" }]);
  const aiPlan = useSelector((state) => state.persisted?.studyPlan || "");

  const [examTypeOther, setExamTypeOther] = useState(() => {
    return EXAM_OPTIONS.includes(examType) ? "" : examType;
  });

  const setExamType = (val) => {
    dispatch(setStudyPlannerState({ studyPlanExamType: val }));
  };

  const setExamDate = (val) => {
    dispatch(setStudyPlannerState({ studyPlanExamDate: val }));
  };

  const setChapters = (valOrFn) => {
    const nextChapters = typeof valOrFn === "function" ? valOrFn(chapters) : valOrFn;
    dispatch(setStudyPlannerState({ studyPlanChapters: nextChapters }));
  };

  const setAiPlan = (val) => {
    dispatch(setStudyPlannerState({ studyPlan: val }));
  };

  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [saveStatus, setSaveStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initializedFromSave.current || !Array.isArray(savedPlannerWeakTopics) || savedPlannerWeakTopics.length === 0) return;
    const isDefaultState = chapters.length === 1 && !chapters[0]?.name?.trim();
    if (isDefaultState) {
      initializedFromSave.current = true;
      setChapters(savedPlannerWeakTopics.map((name) => ({ id: crypto.randomUUID(), name: String(name).trim(), status: "Weak" })));
    }
  }, [savedPlannerWeakTopics, chapters]);

  const parsedPlan = useMemo(() => parsePlanDays(aiPlan), [aiPlan]);
  const resolvedExamType = examType === "Other" ? examTypeOther.trim() || "Other" : examType;

  const handleGeneratePlan = async () => {
    const trimmedChapters = chapters.map((c) => ({ name: c.name.trim(), status: c.status })).filter((c) => c.name.length > 0);
    if (!resolvedExamType) { setPlanError("Please select or enter an exam type."); return; }
    if (!examDate) { setPlanError("Please choose your exam date."); return; }
    if (trimmedChapters.length === 0) { setPlanError("Add at least one chapter name with its status."); return; }

    setPlanLoading(true);
    setPlanError(null);
    setAiPlan("");
    try {
      const res = await fetch(`${API_BASE}/api/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examType: resolvedExamType, examDate, chapters: trimmedChapters }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      setAiPlan(data.plan || "");
      const weakNames = trimmedChapters.filter((c) => c.status === "Weak").map((c) => c.name.trim()).filter(Boolean);
      if (weakNames.length > 0) dispatch(syncPlannerWeakTopics(weakNames));
    } catch (err) {
      setPlanError(err.message || "Could not generate plan. Is the server running?");
    } finally {
      setPlanLoading(false);
    }
  };

  const handleSaveCompletedTopics = async () => {
    const completedNames = chapters.filter((c) => c.status === "Completed" && c.name.trim()).map((c) => c.name.trim());
    const weakNames = chapters.filter((c) => c.status === "Weak" && c.name.trim()).map((c) => c.name.trim());
    if (completedNames.length === 0 && weakNames.length === 0) { setSaveStatus("Mark chapters as Completed or Weak first."); setTimeout(() => setSaveStatus(null), 3000); return; }
    setSaving(true); setSaveStatus(null);
    try {
      if (completedNames.length > 0) dispatch(removeCompletedTopics(completedNames));
      dispatch(replacePlannerWeakTopics(weakNames));
      const s = store.getState();
      await saveUserProfile({
        plannerWeakTopics: s.knowledge.plannerWeakTopics,
        spacedWeakTopics: s.knowledge.spacedWeakTopics,
        practiceWeakTopics: s.knowledge.practiceWeakTopics,
        concepts: s.knowledge.concepts,
        adaptiveStats: s.study.adaptiveStats,
        flashcards: s.study.flashcards,
        progressStats: s.progress,
        tutorChatHistory: s.persisted.tutorChatHistory,
        studyPlan: s.persisted.studyPlan,
        studyPlanChapters: s.persisted.studyPlanChapters,
        studyPlanExamType: s.persisted.studyPlanExamType,
        studyPlanExamDate: s.persisted.studyPlanExamDate,
      });
      setSaveStatus("Saved — completed topics removed from weak list.");
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) { setSaveStatus(err.message || "Failed to save."); } finally { setSaving(false); }
  };

  const handleSaveWeakTopics = async () => {
    const weakNames = chapters.filter((c) => c.status === "Weak" && c.name.trim()).map((c) => c.name.trim());
    if (weakNames.length === 0) { setSaveStatus("No weak topics to save. Mark chapters as 'Weak' first."); setTimeout(() => setSaveStatus(null), 4000); return; }
    setSaving(true); setSaveStatus(null);
    try {
      dispatch(syncPlannerWeakTopics(weakNames));
      const s = store.getState();
      const result = await saveUserProfile({
        plannerWeakTopics: s.knowledge.plannerWeakTopics,
        spacedWeakTopics: s.knowledge.spacedWeakTopics,
        practiceWeakTopics: s.knowledge.practiceWeakTopics,
        concepts: s.knowledge.concepts,
        adaptiveStats: s.study.adaptiveStats,
        flashcards: s.study.flashcards,
        progressStats: s.progress,
        tutorChatHistory: s.persisted.tutorChatHistory,
        studyPlan: s.persisted.studyPlan,
        studyPlanChapters: s.persisted.studyPlanChapters,
        studyPlanExamType: s.persisted.studyPlanExamType,
        studyPlanExamDate: s.persisted.studyPlanExamDate,
      });
      setSaveStatus(result?.skipped ? "Database unavailable — topics synced locally" : "Saved to database");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) { setSaveStatus(err.message || "Failed to save."); } finally { setSaving(false); }
  };

  const CARD = { border: "2px solid var(--border-hard)", borderRadius: "4px", background: "var(--card)", padding: "1.5rem" };

  return (
    <div className="p-8 space-y-6 relative max-w-7xl mx-auto overflow-hidden">
      {/* Stickers */}
      <div className="sticker sticker-slow" style={{ top: "4%", right: "2%", fontSize: "2.5rem", "--sticker-rot": "-12deg" }}>📅</div>
      <div className="sticker sticker-drift" style={{ top: "35%", right: "3%", fontSize: "2rem", "--sticker-rot": "8deg", animationDelay: "1s" }}>⏰</div>
      <div className="sticker sticker-wobble" style={{ bottom: "12%", right: "4%", fontSize: "1.8rem", "--sticker-rot": "-6deg", animationDelay: "0.6s" }}>📝</div>

      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 rounded-full" style={{ background: "#C0392B" }} />
          <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
            Study Planner
          </h1>
        </div>
        <p className="text-sm text-muted-foreground ml-4">
          Tell us your exam, date, and chapters — get a day-by-day 7-week plan shown as stacked cards.
        </p>
      </div>

      <div className="space-y-6 max-w-4xl">
        <div style={CARD}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 flex items-center justify-center shrink-0" style={{ background: "#1B2540", borderRadius: "4px" }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
                Weekly Study Plan
              </h2>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#C0392B" }}>
                JEE · NEET · UPSC
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-6 mt-2">
            Enter your exam, date, and chapter statuses. Plan is shown as interactive day cards.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Exam type
              </label>
              <select
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className={inputCls}
                style={inputStyle}
              >
                {EXAM_OPTIONS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              {examType === "Other" && (
                <input
                  className={`${inputCls} mt-2`}
                  style={inputStyle}
                  placeholder="e.g. GATE, CAT"
                  value={examTypeOther}
                  onChange={(e) => setExamTypeOther(e.target.value)}
                />
              )}
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Exam date
              </label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className={inputCls}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Syllabus chapters
              </label>
              <button
                type="button"
                onClick={() => setChapters((prev) => [...prev, { id: crypto.randomUUID(), name: "", status: "Not Started" }])}
                className="text-xs font-bold flex items-center gap-1 hover:opacity-70 transition-opacity"
                style={{ color: "#C0392B" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add chapter
              </button>
            </div>
            <div className="space-y-2">
              {chapters.map((c) => (
                <div key={c.id} className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                  <input
                    className={`flex-1 ${inputCls}`}
                    style={inputStyle}
                    placeholder="Chapter name (e.g. Thermodynamics)"
                    value={c.name}
                    onChange={(e) => setChapters((prev) => prev.map((x) => x.id === c.id ? { ...x, name: e.target.value } : x))}
                  />
                  <select
                    value={c.status}
                    onChange={(e) => setChapters((prev) => prev.map((x) => x.id === c.id ? { ...x, status: e.target.value } : x))}
                    className="sm:w-44 text-sm px-3 py-2.5 outline-none text-white font-medium"
                    style={{
                      background: STATUS_STYLE[c.status]?.bg || "#1B2540",
                      border: "2px solid var(--border-hard)",
                      borderRadius: "4px",
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s} style={{ background: "#1B2540", color: "#fff" }}>{s}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setChapters((prev) => prev.length <= 1 ? prev : prev.filter((x) => x.id !== c.id))}
                    className="p-2 text-muted-foreground hover:text-[#C0392B] transition-colors"
                    style={{ border: "2px solid var(--border-hard)", borderRadius: "4px" }}
                    disabled={chapters.length <= 1}
                    title="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const weak = chapters.filter((c) => c.status === "Weak" && c.name.trim()).map((c) => c.name.trim());
                  if (weak.length) dispatch(syncPlannerWeakTopics(weak));
                }}
                className="text-xs font-bold underline-offset-2 hover:underline"
                style={{ color: "#2471A3" }}
              >
                Sync weak to knowledge graph
              </button>
              <button
                type="button"
                onClick={handleSaveCompletedTopics}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-bold disabled:opacity-50 transition-all"
                style={{ background: "#2471A3", borderRadius: "4px" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Mark Completed
              </button>
              <button
                type="button"
                onClick={handleSaveWeakTopics}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 text-white text-sm font-bold disabled:opacity-50 transition-all"
                style={{ background: "#1E8449", borderRadius: "4px" }}
              >
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : saveStatus === "Saved to database" ? <><Check className="w-4 h-4" />Saved</> : <><Save className="w-4 h-4" />Save weak topics</>}
              </button>
              {saveStatus && (
                <span className="text-xs font-medium" style={{ color: "#E67E22" }} role="status">
                  {saveStatus}
                </span>
              )}
            </div>
          </div>

          {planError && (
            <p className="text-sm font-medium mb-3" style={{ color: "#C0392B" }} role="alert">⚠ {planError}</p>
          )}

          <button
            type="button"
            onClick={handleGeneratePlan}
            disabled={planLoading}
            className="inline-flex items-center gap-2 px-6 py-3 text-white text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90 active:translate-y-0.5"
            style={{ background: "#C0392B", borderRadius: "4px" }}
          >
            {planLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" />Generating plan…</>
            ) : (
              <>📅 Generate 7-day plan</>
            )}
          </button>
        </div>

        {planLoading && (
          <div className="my-6">
            <AILoader />
          </div>
        )}

        {!planLoading && aiPlan && parsedPlan.days.length > 0 && (
          <DayCardStack days={parsedPlan.days} finalTips={parsedPlan.finalTips} />
        )}

        {!planLoading && aiPlan && parsedPlan.days.length === 0 && (
          <div style={{ border: "2px solid var(--border-hard)", borderRadius: "4px", background: "var(--card)", padding: "1.5rem" }}>
            <h3 className="text-sm font-bold text-muted-foreground mb-3 uppercase tracking-wider">Your plan</h3>
            <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed max-h-[min(70vh,520px)] overflow-y-auto">
              {parsedPlan.fallback || aiPlan}
            </pre>
            {parsedPlan.finalTips && (
              <div className="mt-6 p-4 text-sm whitespace-pre-wrap" style={{ border: "2px solid #E67E22", borderRadius: "4px", background: "var(--card)" }}>
                <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#E67E22" }}>📌 Final tips</p>
                <p className="text-foreground">{parsedPlan.finalTips}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
