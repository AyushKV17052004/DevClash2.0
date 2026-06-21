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
import { AILoader } from "./AILoader";

const STORAGE_KEY = "learnai-subjects-chapters";

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
    color: "#1E8449", // deep green
  },
  {
    id: "JEE",
    label: "JEE",
    blurb: "Physics, Chemistry & Mathematics — engineering entrance focus.",
    color: "#1B2540", // deep navy
  },
  {
    id: "UPSC",
    label: "UPSC",
    blurb: "History, Geography, Polity, Economy, Environment & Science & Tech.",
    color: "#E67E22", // mustard
  },
];

function getExamSubjectNames(exam) {
  const syllabus = EXAM_SYLLABUS[exam];
  if (!syllabus) return [];
  return Object.keys(syllabus);
}

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

  /** Problem of the day (Daily MCQ) */
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

  const panelStyle = {
    border: "2px solid var(--border-hard)",
    borderRadius: "4px",
    background: "var(--card)",
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 relative overflow-hidden">
      {/* Stickers */}
      <div className="sticker sticker-slow" style={{ top: "4%", right: "2%", fontSize: "2.5rem", "--sticker-rot": "-12deg" }}>📖</div>
      <div className="sticker sticker-drift" style={{ top: "35%", right: "3%", fontSize: "2rem", "--sticker-rot": "8deg", animationDelay: "1s" }}>✏️</div>

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 rounded-full" style={{ background: "#C0392B" }} />
            <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
              Subjects & Syllabus
            </h1>
          </div>
          <p className="text-muted-foreground ml-4">
            Choose your exam, then a subject, and mark chapters complete as you finish them.
          </p>
        </div>
        <button
          type="button"
          onClick={openProblemOfDay}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 border-2 text-foreground font-bold hover:bg-muted/30 transition-colors shrink-0"
          style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}
        >
          <Lightbulb className="w-5 h-5 text-accent2" />
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
            className="w-full max-w-lg border-2 bg-card shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 id="pod-title" className="text-lg font-black text-foreground flex items-center gap-2" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
                <Lightbulb className="w-5 h-5 text-accent2" />
                Problem of the Day
              </h2>
              <button
                type="button"
                onClick={closePod}
                className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted/30"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {podShowPick && !podLoading && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Pick an exam — we’ll show one random daily MCQ matching PYQ standards.
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {["JEE", "NEET", "UPSC"].map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => fetchProblemOfDay(id)}
                        className="text-left px-4 py-3 border-2 bg-card hover:bg-muted/20 text-foreground font-bold transition-all"
                        style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {podLoading && (
                <AILoader />
              )}

              {podErr && (
                <p className="text-sm font-semibold text-accent" role="alert">
                  ⚠ {podErr}
                </p>
              )}

              {podData?.question && !podLoading && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2 py-1 bg-primary/10 text-primary border border-primary/30 rounded-sm font-bold uppercase tracking-wider">
                      {podData.examTrack || "Exam"}
                    </span>
                    {podData.question.subtopic && (
                      <span className="px-2 py-1 bg-muted text-foreground border border-border rounded-sm">
                        {podData.question.subtopic}
                      </span>
                    )}
                    {podData.question.sourceLabel && (
                      <span className="px-2 py-1 bg-accent2/10 text-accent2 border border-accent2/25 rounded-sm font-bold">
                        {podData.question.sourceLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-foreground font-bold leading-relaxed">{podData.question.question}</p>
                  <div className="space-y-2">
                    {(podData.question.options || []).map((opt, i) => {
                      const correct = i === podData.question.correctIndex;
                      const picked = podAnswerIdx === i;
                      let optionStyle = {
                        borderColor: "var(--border)",
                        background: "var(--card)",
                        color: "var(--foreground)",
                      };
                      if (podAnswerIdx != null) {
                        if (correct) {
                          optionStyle.borderColor = "var(--accent4)";
                          optionStyle.background = "rgba(30, 132, 73, 0.1)";
                        } else if (picked) {
                          optionStyle.borderColor = "var(--accent)";
                          optionStyle.background = "rgba(192, 57, 43, 0.1)";
                        } else {
                          optionStyle.borderColor = "var(--border)";
                          optionStyle.background = "var(--muted)";
                          optionStyle.color = "var(--muted-foreground)";
                        }
                      }
                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={podAnswerIdx != null}
                          onClick={() => setPodAnswerIdx(i)}
                          className="w-full text-left px-4 py-3 border-2 transition-colors font-semibold"
                          style={{ ...optionStyle, borderRadius: "4px" }}
                        >
                          <span className="font-mono text-xs text-muted-foreground mr-2">{String.fromCharCode(65 + i)}.</span>
                          {opt || "—"}
                        </button>
                      );
                    })}
                  </div>
                  {podAnswerIdx != null && (
                    <div className="border-2 p-4 text-sm" style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}>
                      <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1 font-bold">Explanation</p>
                      <p className="text-foreground leading-relaxed">{podData.question.explanation}</p>
                      {podAnswerIdx === podData.question.correctIndex ? (
                        <p className="mt-2 text-accent4 font-black">Correct!</p>
                      ) : (
                        <p className="mt-2 text-accent font-black">Correct answer: Option {String.fromCharCode(65 + podData.question.correctIndex)}</p>
                      )}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const t = podData.examTrack || exam || "JEE";
                      fetchProblemOfDay(["JEE", "NEET", "UPSC"].includes(t) ? t : "JEE");
                    }}
                    className="w-full py-2.5 border-2 text-foreground font-bold hover:bg-muted/30 text-sm"
                    style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}
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
              className="text-left border-2 p-6 bg-card transition-all hover:-translate-y-0.5"
              style={{
                borderColor: `${e.color}30`,
                borderRadius: "4px",
              }}
              onMouseEnter={(el) => {
                el.currentTarget.style.borderColor = e.color;
              }}
              onMouseLeave={(el) => {
                el.currentTarget.style.borderColor = `${e.color}30`;
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <GraduationCap className="w-6 h-6" style={{ color: e.color }} />
                <span className="text-xl font-black text-foreground" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>{e.label}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{e.blurb}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Subjects for selected exam */}
      {exam && !subject && syllabusForExam && (
        <div className="space-y-4 animate-fade-in">
          <button
            type="button"
            onClick={() => setExam(null)}
            className="inline-flex items-center gap-2 text-sm text-accent font-bold hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Change exam
          </button>
          <h2 className="text-lg font-black text-foreground" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
            {exam} — all subjects
          </h2>

          <div className="flex flex-wrap gap-3 p-4 border-2 bg-accent/5" style={{ borderColor: "var(--accent)", borderRadius: "4px" }}>
            <button
              type="button"
              onClick={openProblemOfDay}
              className="inline-flex items-center gap-2 px-4 py-2.5 border-2 text-foreground font-bold hover:bg-muted/30 bg-card transition-colors"
              style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}
            >
              <Lightbulb className="w-4 h-4 text-accent2" />
              Problem of the day
            </button>
            <button
              type="button"
              onClick={handleCreateMockTest}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-accent text-white font-bold hover:opacity-95 transition-opacity"
              style={{ borderRadius: "4px" }}
            >
              <FileQuestion className="w-4 h-4" />
              Create Mock Test
            </button>
            <button
              type="button"
              onClick={handleCreateTest}
              className="inline-flex items-center gap-2 px-4 py-2.5 border-2 text-foreground font-bold hover:bg-muted/30 bg-card transition-colors"
              style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}
            >
              <ClipboardList className="w-4 h-4" />
              Create Test (all chapters)
            </button>
            <p className="text-xs text-muted-foreground self-center mt-1 sm:mt-0">
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
                  className="text-left border-2 bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent"
                  style={{ borderColor: "var(--border)", borderRadius: "4px" }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-black text-foreground" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>{name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 font-medium">
                        {done}/{total} chapters marked complete
                      </p>
                    </div>
                    <BookOpen className="w-5 h-5 text-accent3 shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3 — Chapters */}
      {exam && subject && (
        <div className="space-y-4 animate-fade-in">
          <button
            type="button"
            onClick={() => setSubject(null)}
            className="inline-flex items-center gap-2 text-sm text-accent font-bold hover:underline"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to subjects
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-foreground" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
                {exam} — {subject}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Tick means chapter completed; empty circle means yet to study.
              </p>
            </div>
            <p className="text-sm text-accent4 font-black tabular-nums">
              {completedCount}/{chaptersForSubject.length} done
            </p>
          </div>

          <ul className="divide-y border-2 bg-card overflow-hidden" style={{ borderColor: "var(--border-hard)", borderRadius: "4px", divideColor: "var(--border)" }}>
            {chaptersForSubject.map((ch) => {
              const done = isChapterDone(ch);
              return (
                <li key={ch} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleChapter(ch)}
                    className="flex-1 flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/15 transition-colors min-w-0"
                  >
                    {done ? (
                      <CheckCircle2
                         className="w-6 h-6 shrink-0 text-accent4"
                         aria-hidden
                       />
                     ) : (
                       <Circle
                         className="w-6 h-6 shrink-0 text-muted-foreground/60"
                         strokeWidth={1.75}
                         aria-hidden
                       />
                     )}
                     <span
                       className={`text-sm truncate font-semibold ${
                         done ? "text-accent4" : "text-foreground"
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
                     className="shrink-0 px-3 py-2 border-2 text-foreground text-xs font-bold hover:bg-accent/10 hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5 mr-4"
                     style={{ borderColor: "var(--border)", borderRadius: "4px" }}
                     title={`Practice PYQ for ${ch}`}
                   >
                     <Target className="w-3.5 h-3.5 text-accent" />
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
