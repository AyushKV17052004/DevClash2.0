import { useState, useMemo, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Plus,
  Sparkles,
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
} from "lucide-react";
import { syncPlannerWeakTopics, replacePlannerWeakTopics, removeCompletedTopics } from "../../redux/knowledgeGraphSlice";
import { saveUserProfile } from "../../api/userApi";
import { store } from "../../redux/store";
import { API_BASE } from "../../config/api";

const STATUS_OPTIONS = ["Completed", "Weak", "Not Started"];

const EXAM_OPTIONS = ["JEE Main", "JEE Advanced", "NEET", "UPSC CSE", "Other"];

/**
 * Split Gemini plan text into Day 1…Day 7 blocks + optional Final Tips.
 */
function parsePlanDays(raw) {
  if (!raw?.trim()) return { days: [], finalTips: "", fallback: "" };

  let text = raw.trim();
  let finalTips = "";

  const tipsSplit = text.split(/(?:^|\n)\s*Final\s*Tips\s*:\s*/i);
  if (tipsSplit.length > 1) {
    finalTips = tipsSplit.slice(1).join("").trim();
    text = tipsSplit[0].trim();
  }

  const chunks = text
    .split(/(?=^Day\s*\d+\s*:?\s*)/im)
    .map((s) => s.trim())
    .filter(Boolean);

  const days = [];
  for (const chunk of chunks) {
    const m = chunk.match(/^Day\s*(\d+)\s*:?\s*\n?([\s\S]*)$/i);
    if (m) {
      days.push({
        day: Number(m[1]),
        content: String(m[2] ?? "").trim(),
      });
    }
  }

  if (days.length === 0) {
    return { days: [], finalTips, fallback: text };
  }

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
        className={`text-sm text-gray-200 leading-relaxed ${
          isBullet ? "pl-2 border-l-2 border-purple-500/40 ml-1" : ""
        }`}
      >
        {trimmed}
      </p>
    );
  });
}

function DayCardStack({ days, finalTips }) {
  const [active, setActive] = useState(0);
  const total = days.length;

  const goNext = () => setActive((i) => (i + 1) % total);
  const goPrev = () => setActive((i) => (i - 1 + total) % total);

  if (total === 0) return null;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-violet-400" />
          <h3 className="text-lg font-semibold text-white">Your week — tap the card for next day</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goPrev}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-400 tabular-nums min-w-[5rem] text-center">
            Day {days[active].day} · {active + 1}/{total}
          </span>
          <button
            type="button"
            onClick={goNext}
            className="p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10"
            aria-label="Next day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-3xl min-h-[min(70vh,520px)] perspective-[1200px]">
        {days.map((d, i) => {
          const stackPos = (i - active + total) % total;
          const isTop = stackPos === 0;
          const z = total - stackPos;
          const translateY = stackPos * 10;
          const scale = 1 - stackPos * 0.028;
          const opacity = stackPos > 4 ? 0 : 1 - stackPos * 0.12;

          return (
            <button
              key={`${d.day}-${i}`}
              type="button"
              onClick={isTop ? goNext : () => setActive(i)}
              className={`
                absolute left-0 right-0 top-0 mx-auto w-full text-left rounded-2xl border overflow-hidden
                transition-all duration-500 ease-out shadow-2xl
                ${
                  isTop
                    ? "border-violet-500/40 bg-gradient-to-br from-[#1e1e35] via-[#1a1a2e] to-[#15152a] cursor-pointer ring-1 ring-violet-500/20"
                    : "border-white/10 bg-[#14141f] cursor-pointer hover:border-white/20"
                }
              `}
              style={{
                zIndex: z,
                transform: `translateY(${translateY}px) scale(${scale})`,
                opacity,
                pointerEvents: opacity < 0.15 ? "none" : "auto",
              }}
            >
              <div className="px-6 pt-5 pb-2 border-b border-white/5 flex items-center justify-between gap-3 bg-gradient-to-r from-violet-600/20 to-blue-600/10">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-violet-300/90">
                    Study day
                  </p>
                  <h4 className="text-xl font-semibold text-white">Day {d.day}</h4>
                </div>
                {isTop && (
                  <span className="text-xs text-gray-500 shrink-0 hidden sm:block">
                    Click for next →
                  </span>
                )}
              </div>
              <div className="px-6 py-5 space-y-2 max-h-[min(55vh,440px)] overflow-y-auto">
                {formatDayContent(d.content)}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex justify-center gap-1.5 flex-wrap">
        {days.map((d, i) => (
          <button
            key={d.day}
            type="button"
            onClick={() => setActive(i)}
            className={`h-2 rounded-full transition-all ${
              i === active
                ? "w-8 bg-violet-500"
                : "w-2 bg-white/20 hover:bg-white/35"
            }`}
            aria-label={`Go to day ${d.day}`}
          />
        ))}
      </div>

      {finalTips && (
        <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-6 shadow-lg">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-200/90 mb-3">
            Final tips
          </h3>
          <div className="space-y-2 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
            {finalTips}
          </div>
        </div>
      )}
    </div>
  );
}

export function StudyPlanner() {
  const dispatch = useDispatch();
  const savedPlannerWeakTopics = useSelector(
    (state) => state.knowledge?.plannerWeakTopics ?? []
  );
  const initializedFromSave = useRef(false);

  const [examType, setExamType] = useState("JEE Main");
  const [examTypeOther, setExamTypeOther] = useState("");
  const [examDate, setExamDate] = useState("");
  const [chapters, setChapters] = useState([
    { id: "1", name: "", status: "Not Started" },
  ]);

  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [aiPlan, setAiPlan] = useState("");
  const [saveStatus, setSaveStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  // Pre-populate chapters from saved weak topics on load/refresh
  useEffect(() => {
    if (
      initializedFromSave.current ||
      !Array.isArray(savedPlannerWeakTopics) ||
      savedPlannerWeakTopics.length === 0
    )
      return;
    const isDefaultState =
      chapters.length === 1 && !chapters[0]?.name?.trim();
    if (isDefaultState) {
      initializedFromSave.current = true;
      setChapters(
        savedPlannerWeakTopics.map((name) => ({
          id: crypto.randomUUID(),
          name: String(name).trim(),
          status: "Weak",
        }))
      );
    }
  }, [savedPlannerWeakTopics, chapters]);

  const parsedPlan = useMemo(() => parsePlanDays(aiPlan), [aiPlan]);

  const resolvedExamType =
    examType === "Other" ? examTypeOther.trim() || "Other" : examType;

  const handleGeneratePlan = async () => {
    const trimmedChapters = chapters
      .map((c) => ({ name: c.name.trim(), status: c.status }))
      .filter((c) => c.name.length > 0);

    if (!resolvedExamType) {
      setPlanError("Please select or enter an exam type.");
      return;
    }
    if (!examDate) {
      setPlanError("Please choose your exam date.");
      return;
    }
    if (trimmedChapters.length === 0) {
      setPlanError("Add at least one chapter name with its status.");
      return;
    }

    setPlanLoading(true);
    setPlanError(null);
    setAiPlan("");

    try {
      const res = await fetch(`${API_BASE}/api/study-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examType: resolvedExamType,
          examDate,
          chapters: trimmedChapters,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      setAiPlan(data.plan || "");

      const weakNames = trimmedChapters
        .filter((c) => c.status === "Weak")
        .map((c) => c.name.trim())
        .filter(Boolean);
      if (weakNames.length > 0) {
        dispatch(syncPlannerWeakTopics(weakNames));
      }
    } catch (err) {
      setPlanError(err.message || "Could not generate plan. Is the server running?");
    } finally {
      setPlanLoading(false);
    }
  };

  const handleSaveCompletedTopics = async () => {
    const completedNames = chapters
      .filter((c) => c.status === "Completed" && c.name.trim())
      .map((c) => c.name.trim());
    const weakNames = chapters
      .filter((c) => c.status === "Weak" && c.name.trim())
      .map((c) => c.name.trim());
    if (completedNames.length === 0 && weakNames.length === 0) {
      setSaveStatus("Mark chapters as Completed or Weak first.");
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }
    setSaving(true);
    setSaveStatus(null);
    try {
      if (completedNames.length > 0) {
        dispatch(removeCompletedTopics(completedNames));
      }
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
      });
      setSaveStatus("Completed topics removed from weak; saved to database.");
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err) {
      setSaveStatus(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWeakTopics = async () => {
    const weakNames = chapters
      .filter((c) => c.status === "Weak" && c.name.trim())
      .map((c) => c.name.trim());
    if (weakNames.length === 0) {
      setSaveStatus("No weak topics to save. Mark chapters as 'Weak' first.");
      setTimeout(() => setSaveStatus(null), 4000);
      return;
    }
    setSaving(true);
    setSaveStatus(null);
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
      });
      if (result?.skipped) {
        setSaveStatus("Database unavailable — topics synced locally");
      } else {
        setSaveStatus("Saved to database");
      }
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus(err.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 space-y-6 relative max-w-7xl mx-auto">
      <div className="mb-2">
        <h1 className="text-3xl font-semibold text-white mb-2">Study Planner</h1>
        <p className="text-gray-400">
          Generate a Gemini weekly plan — browse each day as stacked cards (click the
          front card or use arrows).
        </p>
      </div>

      <div className="space-y-6 max-w-4xl">
        <div className="space-y-6">
          <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg space-y-6">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-purple-400" />
              <h2 className="text-xl font-semibold text-white">
                Gemini weekly study plan
              </h2>
              <span className="text-xs text-gray-500 ml-1">(JEE · NEET · UPSC)</span>
            </div>
            <p className="text-sm text-gray-400">
              Enter your exam, exam date, and chapter statuses. Output is shown as
              interactive day cards instead of a timetable grid.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Exam type</label>
                <select
                  value={examType}
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white outline-none"
                >
                  {EXAM_OPTIONS.map((e) => (
                    <option key={e} value={e} className="bg-[#1a1a2e]">
                      {e}
                    </option>
                  ))}
                </select>
                {examType === "Other" && (
                  <input
                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white outline-none"
                    placeholder="e.g. GATE, CAT"
                    value={examTypeOther}
                    onChange={(e) => setExamTypeOther(e.target.value)}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1 flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  Exam date
                </label>
                <input
                  type="date"
                  value={examDate}
                  onChange={(e) => setExamDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-gray-400 flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  Syllabus chapters
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setChapters((prev) => [
                      ...prev,
                      { id: crypto.randomUUID(), name: "", status: "Not Started" },
                    ])
                  }
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add chapter
                </button>
              </div>
              <div className="space-y-2">
                {chapters.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center"
                  >
                    <input
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500/50"
                      placeholder="Chapter name (e.g. Thermodynamics)"
                      value={c.name}
                      onChange={(e) =>
                        setChapters((prev) =>
                          prev.map((x) =>
                            x.id === c.id ? { ...x, name: e.target.value } : x
                          )
                        )
                      }
                    />
                    <select
                      value={c.status}
                      onChange={(e) =>
                        setChapters((prev) =>
                          prev.map((x) =>
                            x.id === c.id ? { ...x, status: e.target.value } : x
                          )
                        )
                      }
                      className="sm:w-44 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s} className="bg-[#1a1a2e]">
                          {s}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setChapters((prev) =>
                          prev.length <= 1 ? prev : prev.filter((x) => x.id !== c.id)
                        )
                      }
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg sm:self-auto"
                      disabled={chapters.length <= 1}
                      title="Remove row"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const weak = chapters
                      .filter((c) => c.status === "Weak" && c.name.trim())
                      .map((c) => c.name.trim());
                    if (weak.length) dispatch(syncPlannerWeakTopics(weak));
                  }}
                  className="text-xs text-cyan-400 hover:text-cyan-300 underline-offset-2 hover:underline"
                >
                  Sync weak chapters to knowledge graph (no AI call)
                </button>
                <button
                  type="button"
                  onClick={handleSaveCompletedTopics}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600/90 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                  title="Remove completed topics from weak list; save to DB"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Save Completed topics
                </button>
                <button
                  type="button"
                  onClick={handleSaveWeakTopics}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving…
                    </>
                  ) : saveStatus === "Saved to database" ? (
                    <>
                      <Check className="w-4 h-4 text-green-300" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save weak topics to database
                    </>
                  )}
                </button>
                {saveStatus && (
                  <span className="text-xs text-amber-400" role="status">
                    {saveStatus}
                  </span>
                )}
              </div>
            </div>

            {planError && (
              <p className="text-sm text-red-400" role="alert">
                {planError}
              </p>
            )}

            <button
              type="button"
              onClick={handleGeneratePlan}
              disabled={planLoading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500/90 to-orange-600 text-white font-medium disabled:opacity-50"
            >
              {planLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating plan…
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate weekly plan
                </>
              )}
            </button>
          </div>

          {aiPlan && parsedPlan.days.length > 0 && (
            <DayCardStack days={parsedPlan.days} finalTips={parsedPlan.finalTips} />
          )}

          {aiPlan && parsedPlan.days.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-[#1a1a2e] p-6">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Your plan</h3>
              {parsedPlan.fallback ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed max-h-[min(70vh,520px)] overflow-y-auto">
                  {parsedPlan.fallback}
                </pre>
              ) : (
                <pre className="whitespace-pre-wrap text-sm text-gray-200 font-sans leading-relaxed max-h-[min(70vh,520px)] overflow-y-auto">
                  {aiPlan}
                </pre>
              )}
              {parsedPlan.finalTips && (
                <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-gray-200 whitespace-pre-wrap">
                  <p className="text-xs font-semibold text-amber-200/90 mb-2">
                    Final tips
                  </p>
                  {parsedPlan.finalTips}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
