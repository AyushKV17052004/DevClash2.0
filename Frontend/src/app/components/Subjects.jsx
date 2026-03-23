import { useState, useMemo, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  BookOpen,
  ChevronLeft,
  GraduationCap,
  CheckCircle2,
  Circle,
  FileQuestion,
  ClipboardList,
  Target,
  Lightbulb,
  Loader2,
  X,
} from "lucide-react";
import { setPracticeIntent } from "../../redux/practiceIntentSlice";
import { API_BASE } from "../../config/api";

const STORAGE_KEY = "learnai-subjects-chapters";

/**
 * Hardcoded main chapters per exam — no API calls.
 * Tick = completed; unticked = yet to study (stored in localStorage).
 */
const EXAM_SYLLABUS = {
  NEET: {
    Physics: [
      "Mechanics",
      "Heat & Thermodynamics",
      "Oscillations & Waves",
      "Electrostatics",
      "Current Electricity",
      "Magnetic Effects & EMI",
      "Optics",
      "Dual Nature of Matter",
      "Atoms & Nuclei",
      "Electronic Devices",
    ],
    Chemistry: [
      "Some Basic Concepts",
      "Structure of Atom",
      "Chemical Bonding",
      "States of Matter",
      "Thermodynamics",
      "Equilibrium",
      "Redox Reactions",
      "Organic Chemistry — Basic Principles",
      "Hydrocarbons",
      "Biomolecules",
    ],
    Biology: [
      "Living World & Classification",
      "Plant Kingdom",
      "Animal Kingdom",
      "Cell Structure & Division",
      "Plant Physiology",
      "Human Physiology — Digestion & Breathing",
      "Human Physiology — Circulation & Excretion",
      "Genetics & Evolution",
      "Ecology",
      "Biotechnology",
    ],
  },
  JEE: {
    Physics: [
      "Mechanics",
      "Heat & Thermodynamics",
      "Waves & Sound",
      "Electrostatics",
      "Current Electricity",
      "Magnetism & EMI",
      "Optics",
      "Modern Physics",
      "Semiconductor Devices",
    ],
    Chemistry: [
      "Atomic Structure",
      "Chemical Bonding",
      "States of Matter",
      "Thermodynamics",
      "Chemical Kinetics",
      "Equilibrium",
      "Hydrocarbons & Organic Basics",
      "Aldehydes, Ketones & Acids",
      "Coordination Compounds",
      "d- & f-Block Elements",
    ],
    Mathematics: [
      "Sets & Relations",
      "Complex Numbers & Quadratic",
      "Matrices & Determinants",
      "Permutations & Combinations",
      "Calculus — Limits & Continuity",
      "Calculus — Differentiation",
      "Calculus — Integration",
      "Coordinate Geometry",
      "Vectors & 3D Geometry",
      "Probability & Statistics",
    ],
  },
  UPSC: {
    History: [
      "Ancient India — Sources & Society",
      "Medieval India",
      "Modern India — 1757 to 1857",
      "Modern India — National Movement",
      "Post-Independence India",
      "World History — Industrial Revolution to Cold War",
    ],
    Geography: [
      "Physical Geography — Geomorphology",
      "Physical Geography — Climatology",
      "Indian Geography — Resources",
      "Indian Geography — Agriculture & Industry",
      "World Geography",
      "Maps & Locations",
    ],
    Polity: [
      "Constitution — Making & Features",
      "Fundamental Rights & Duties",
      "Union & State Executive",
      "Judiciary & Federalism",
      "Local Government & Elections",
      "Constitutional Bodies",
    ],
    Economy: [
      "Basic Concepts & National Income",
      "Money, Banking & Inflation",
      "Public Finance & Budget",
      "Agriculture & Land Reforms",
      "Industry & Infrastructure",
      "External Sector & Trade",
    ],
    Environment: [
      "Ecology & Ecosystems",
      "Biodiversity & Conservation",
      "Climate Change",
      "Environmental Laws & Conventions",
      "Pollution & Waste Management",
    ],
    "Science & Technology": [
      "Space & Defence Technology",
      "IT, Communication & Cyber",
      "Biotechnology & Health",
      "Energy & Nuclear Technology",
      "Nanotech & Emerging Tech",
    ],
  },
};

function loadProgressFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const p = JSON.parse(raw);
    return typeof p === "object" && p !== null ? p : {};
  } catch {
    return {};
  }
}

function saveProgressToStorage(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    /* ignore */
  }
}

const EXAMS = [
  {
    id: "NEET",
    label: "NEET",
    blurb: "Physics, Chemistry & Biology — medical entrance focus.",
    accent: "from-emerald-500/80 to-teal-600/80",
  },
  {
    id: "JEE",
    label: "JEE",
    blurb: "Physics, Chemistry & Mathematics — engineering entrance focus.",
    accent: "from-violet-500/80 to-indigo-600/80",
  },
  {
    id: "UPSC",
    label: "UPSC",
    blurb: "History, Geography, Polity, Economy, Environment & Science & Tech.",
    accent: "from-amber-500/80 to-orange-600/80",
  },
];

/** Top-level subject names for an exam (same order as syllabus) */
function getExamSubjectNames(exam) {
  const syllabus = EXAM_SYLLABUS[exam];
  if (!syllabus) return [];
  return Object.keys(syllabus);
}

/**
 * Split `total` questions as evenly as possible across subjects (remainder → first subjects).
 * e.g. 25 / 3 → 9, 8, 8 ; 25 / 6 → 5,4,4,4,4,4
 */
function formatMockPerSubjectDistribution(total, subjectNames) {
  const n = subjectNames.length;
  if (n < 1) return "";
  const base = Math.floor(total / n);
  const rem = total % n;
  const parts = subjectNames.map((name, i) => {
    const c = i < rem ? base + 1 : base;
    return `${c} from ${name}`;
  });
  return (
    `REQUIRED per-subject split for exactly ${total} questions (as equal as possible across ${n} subjects): ${parts.join("; ")}. ` +
    `These counts MUST sum to ${total}. Each question's "subtopic" must clearly name its subject (one of: ${subjectNames.join(", ")}).`
  );
}

/** Get all chapter names for an exam (across all subjects) */
function getAllChaptersForExam(exam) {
  const syllabus = EXAM_SYLLABUS[exam];
  if (!syllabus) return [];
  const chapters = [];
  for (const subject of Object.keys(syllabus)) {
    chapters.push(...(syllabus[subject] || []));
  }
  return chapters;
}

const MOCK_Q_TOTAL = 25;

/** Build mock test prompt: equal split of 25 Q across syllabus subjects; JEE/NEET +4/-1 */
function buildMockTestPrompt(exam, chapters) {
  const chapterList = chapters.slice(0, 50).join(", ");
  const tail = chapters.length > 50 ? ` … and ${chapters.length - 50} more` : "";
  const subjects = getExamSubjectNames(exam);
  const dist = formatMockPerSubjectDistribution(MOCK_Q_TOTAL, subjects);

  if (exam === "JEE") {
    return `Full JEE Main mock test covering all chapters: ${chapterList}${tail}. Generate ${MOCK_Q_TOTAL} questions (100 marks total, 4 marks per question). Marking scheme: +4 for correct answer, -1 for wrong answer. ${dist}`;
  }
  if (exam === "NEET") {
    return `Full NEET (UG) mock test covering all chapters: ${chapterList}${tail}. Generate ${MOCK_Q_TOTAL} questions (100 marks total, 4 marks per question). Marking scheme: +4 for correct answer, -1 for wrong answer. ${dist}`;
  }
  return `Full UPSC CSE Prelims mock test covering all chapters: ${chapterList}${tail}. Generate ${MOCK_Q_TOTAL} questions. ${dist}`;
}

/** Build create-test prompt for all chapters */
function buildCreateTestPrompt(exam, chapters) {
  const chapterList = chapters.slice(0, 60).join(", ");
  const tail = chapters.length > 60 ? ` … and ${chapters.length - 60} more` : "";
  return `Generate a practice test covering all chapters from ${exam} syllabus: ${chapterList}${tail}. Include variety from all subjects. 15-20 questions.`;
}

export function Subjects({ onNavigateToFeature }) {
  const dispatch = useDispatch();
  const [exam, setExam] = useState(null);
  const [subject, setSubject] = useState(null);
  const [progress, setProgress] = useState(loadProgressFromStorage);

  /** Problem of the day (Gemini MCQ) */
  const [podOpen, setPodOpen] = useState(false);
  const [podLoading, setPodLoading] = useState(false);
  const [podErr, setPodErr] = useState(null);
  const [podData, setPodData] = useState(null);
  const [podShowPick, setPodShowPick] = useState(true);
  const [podAnswerIdx, setPodAnswerIdx] = useState(null);

  const closePod = useCallback(() => {
    setPodOpen(false);
    setPodLoading(false);
    setPodErr(null);
    setPodData(null);
    setPodShowPick(true);
    setPodAnswerIdx(null);
  }, []);

  const fetchProblemOfDay = useCallback(async (track) => {
    setPodLoading(true);
    setPodErr(null);
    setPodData(null);
    setPodAnswerIdx(null);
    setPodShowPick(false);
    try {
      const res = await fetch(`${API_BASE}/api/problem-of-day`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam: track }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load problem");
      setPodData(data);
    } catch (e) {
      setPodErr(e?.message || "Request failed");
      setPodShowPick(true);
    } finally {
      setPodLoading(false);
    }
  }, []);

  const openProblemOfDay = useCallback(() => {
    setPodOpen(true);
    setPodErr(null);
    setPodData(null);
    setPodAnswerIdx(null);
    if (exam && ["JEE", "NEET", "UPSC"].includes(exam)) {
      setPodShowPick(false);
      setPodLoading(true);
      fetchProblemOfDay(exam);
    } else {
      setPodShowPick(true);
    }
  }, [exam, fetchProblemOfDay]);

  const handleCreateMockTest = useCallback(() => {
    if (!exam) return;
    const chapters = getAllChaptersForExam(exam);
    const topicInput = buildMockTestPrompt(exam, chapters);
    dispatch(
      setPracticeIntent({
        examTrack: exam,
        topicInput,
        autoGenerate: true,
        isMockTest: true,
      })
    );
    onNavigateToFeature?.("practice");
  }, [exam, dispatch, onNavigateToFeature]);

  const handleCreateTest = useCallback(() => {
    if (!exam) return;
    const chapters = getAllChaptersForExam(exam);
    const topicInput = buildCreateTestPrompt(exam, chapters);
    dispatch(setPracticeIntent({ examTrack: exam, topicInput, autoGenerate: true }));
    onNavigateToFeature?.("practice");
  }, [exam, dispatch, onNavigateToFeature]);

  const handlePracticeChapter = useCallback(
    (chapterName) => {
      if (!exam) return;
      dispatch(setPracticeIntent({
        examTrack: exam,
        topicInput: chapterName,
        autoGenerate: true,
      }));
      onNavigateToFeature?.("practice");
    },
    [exam, dispatch, onNavigateToFeature]
  );

  const syllabusForExam = exam ? EXAM_SYLLABUS[exam] : null;
  const subjectNames = syllabusForExam ? Object.keys(syllabusForExam) : [];

  const chaptersForSubject = useMemo(() => {
    if (!exam || !subject || !syllabusForExam) return [];
    return syllabusForExam[subject] ?? [];
  }, [exam, subject, syllabusForExam]);

  const isChapterDone = useCallback(
    (ch) => {
      return Boolean(progress?.[exam]?.[subject]?.[ch]);
    },
    [progress, exam, subject]
  );

  const toggleChapter = useCallback(
    (chapterName) => {
      if (!exam || !subject) return;
      setProgress((prev) => {
        const next = { ...prev };
        if (!next[exam]) next[exam] = {};
        if (!next[exam][subject]) next[exam][subject] = {};
        const cur = next[exam][subject][chapterName];
        next[exam][subject] = {
          ...next[exam][subject],
          [chapterName]: !cur,
        };
        saveProgressToStorage(next);
        return next;
      });
    },
    [exam, subject]
  );

  const completedCount = useMemo(() => {
    if (!chaptersForSubject.length) return 0;
    return chaptersForSubject.filter((ch) => isChapterDone(ch)).length;
  }, [chaptersForSubject, isChapterDone]);

  const panel = "bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg";

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Subjects</h1>
          <p className="text-gray-400">
            Choose your exam, then a subject, and mark chapters complete as you finish them.
          </p>
        </div>
        <button
          type="button"
          onClick={openProblemOfDay}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 font-medium hover:bg-cyan-500/20 transition-colors shrink-0"
        >
          <Lightbulb className="w-5 h-5 text-amber-300" />
          Problem of the day
        </button>
      </div>

      {/* Problem of the day modal */}
      {podOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pod-title"
          onClick={(e) => e.target === e.currentTarget && closePod()}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/15 bg-[#12121c] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h2 id="pod-title" className="text-lg font-semibold text-white flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-300" />
                Problem of the day
              </h2>
              <button
                type="button"
                onClick={closePod}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {podShowPick && !podLoading && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400">
                    Pick an exam — we’ll show one random MCQ (AI-generated, PYQ-style).
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {["JEE", "NEET", "UPSC"].map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => fetchProblemOfDay(id)}
                        className="text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:border-purple-500/40 hover:bg-purple-500/10 text-white font-medium transition-colors"
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {podLoading && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-400" />
                  <p className="text-sm">Generating your question…</p>
                </div>
              )}

              {podErr && (
                <p className="text-sm text-red-400" role="alert">
                  {podErr}
                </p>
              )}

              {podData?.question && !podLoading && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 rounded-md bg-purple-500/20 text-purple-200 border border-purple-500/30">
                      {podData.examTrack || "Exam"}
                    </span>
                    {podData.question.subtopic && (
                      <span className="px-2 py-1 rounded-md bg-white/5 text-gray-300 border border-white/10">
                        {podData.question.subtopic}
                      </span>
                    )}
                    {podData.question.sourceLabel && (
                      <span className="px-2 py-1 rounded-md bg-amber-500/15 text-amber-200/90 border border-amber-500/25">
                        {podData.question.sourceLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-white font-medium leading-relaxed">{podData.question.question}</p>
                  <div className="space-y-2">
                    {(podData.question.options || []).map((opt, i) => {
                      const correct = i === podData.question.correctIndex;
                      const picked = podAnswerIdx === i;
                      let cls =
                        "w-full text-left px-4 py-3 rounded-xl border transition-colors ";
                      if (podAnswerIdx == null) {
                        cls += "border-white/10 bg-white/5 hover:border-purple-500/40 text-gray-100";
                      } else {
                        if (correct) cls += "border-emerald-500/60 bg-emerald-500/15 text-emerald-100";
                        else if (picked) cls += "border-red-500/50 bg-red-500/10 text-red-200";
                        else cls += "border-white/5 bg-white/[0.02] text-gray-500";
                      }
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={podAnswerIdx != null}
                          onClick={() => setPodAnswerIdx(i)}
                          className={cls}
                        >
                          <span className="font-mono text-xs text-gray-500 mr-2">{String.fromCharCode(65 + i)}.</span>
                          {opt || "—"}
                        </button>
                      );
                    })}
                  </div>
                  {podAnswerIdx != null && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                      <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Explanation</p>
                      <p className="text-gray-200 leading-relaxed">{podData.question.explanation}</p>
                      {podAnswerIdx === podData.question.correctIndex ? (
                        <p className="mt-2 text-emerald-400 font-medium">Correct!</p>
                      ) : (
                        <p className="mt-2 text-amber-200/90 font-medium">Correct answer: option {String.fromCharCode(65 + podData.question.correctIndex)}</p>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const t = podData.examTrack || exam || "JEE";
                      fetchProblemOfDay(["JEE", "NEET", "UPSC"].includes(t) ? t : "JEE");
                    }}
                    className="w-full py-2.5 rounded-xl border border-white/15 text-sm text-gray-300 hover:bg-white/5"
                  >
                    New random question
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 1 — Exam */}
      {!exam && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {EXAMS.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setExam(e.id)}
              className={`text-left rounded-xl border border-white/10 p-6 bg-gradient-to-br ${e.accent} bg-opacity-20 hover:border-white/25 transition-all shadow-lg hover:shadow-xl`}
            >
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-6 h-6 text-white" />
                <span className="text-xl font-semibold text-white">{e.label}</span>
              </div>
              <p className="text-sm text-white/85 leading-relaxed">{e.blurb}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Subjects for selected exam */}
      {exam && !subject && syllabusForExam && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setExam(null)}
            className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200"
          >
            <ChevronLeft className="w-4 h-4" />
            Change exam
          </button>
          <h2 className="text-lg font-medium text-white">
            {exam} — all subjects
          </h2>

          <div className="flex flex-wrap gap-3 p-4 rounded-xl border border-amber-500/25 bg-amber-500/5">
            <button
              type="button"
              onClick={openProblemOfDay}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 font-medium hover:bg-cyan-500/20 transition-colors"
            >
              <Lightbulb className="w-4 h-4 text-amber-300" />
              Problem of the day
            </button>
            <button
              type="button"
              onClick={handleCreateMockTest}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-amber-500/90 to-orange-600 text-white font-medium hover:opacity-95 transition-opacity"
            >
              <FileQuestion className="w-4 h-4" />
              Create Mock Test
            </button>
            <button
              type="button"
              onClick={handleCreateTest}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-200 font-medium hover:bg-purple-500/20 transition-colors"
            >
              <ClipboardList className="w-4 h-4" />
              Create Test (all chapters)
            </button>
            <p className="text-xs text-gray-400 self-center">
              Mock Test: 25 Q split evenly across {getExamSubjectNames(exam).length} subjects (100 marks, +4 / −1). Create Test: practice across all {exam} chapters.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjectNames.map((name) => {
              const list = syllabusForExam[name];
              const total = list.length;
              const done = list.filter(
                (ch) => progress?.[exam]?.[name]?.[ch]
              ).length;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSubject(name)}
                  className={`${panel} text-left hover:border-purple-500/30 transition-colors`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{name}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {done}/{total} chapters marked complete
                      </p>
                    </div>
                    <BookOpen className="w-5 h-5 text-purple-400 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 — Chapters */}
      {exam && subject && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setSubject(null)}
            className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to subjects
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {exam} — {subject}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Green tick means chapter completed; empty circle means yet to study.
              </p>
            </div>
            <p className="text-sm text-emerald-400/90 tabular-nums">
              {completedCount}/{chaptersForSubject.length} done
            </p>
          </div>

          <ul className={`${panel} divide-y divide-white/10`}>
            {chaptersForSubject.map((ch) => {
              const done = isChapterDone(ch);
              return (
                <li key={ch} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleChapter(ch)}
                    className="flex-1 flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors rounded-xl min-w-0"
                  >
                    {done ? (
                      <CheckCircle2
                        className="w-6 h-6 shrink-0 text-emerald-400"
                        aria-hidden
                      />
                    ) : (
                      <Circle
                        className="w-6 h-6 shrink-0 text-gray-500"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    )}
                    <span
                      className={`text-sm truncate ${
                        done ? "text-emerald-100/95" : "text-white"
                      }`}
                    >
                      {ch}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePracticeChapter(ch);
                    }}
                    className="shrink-0 px-3 py-2 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-200 text-xs font-medium hover:bg-purple-500/20 transition-colors flex items-center gap-1.5"
                    title={`Practice PYQ for ${ch}`}
                  >
                    <Target className="w-3.5 h-3.5" />
                    Practice PYQ
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
