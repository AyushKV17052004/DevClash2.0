import { useMemo, useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearPracticeIntent } from "../../redux/practiceIntentSlice";
import {
  Clock,
  CheckCircle,
  XCircle,
  Target,
  TrendingUp,
  Loader2,
  BookOpen,
  RotateCcw,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import { API_BASE } from "../../config/api";
import { saveUserProfile } from "../../api/userApi";
import { store } from "../../redux/store";
import { recordPracticeWeakTopics } from "../../redux/knowledgeGraphSlice";
import { incrementAdaptiveStats } from "../../redux/studySlice";
import { setMockTestScore } from "../../redux/progressSlice";

const EXAM_OPTIONS = [
  {
    id: "JEE",
    title: "JEE",
    blurb: "JEE Main / Advanced PYQs",
  },
  {
    id: "NEET",
    title: "NEET",
    blurb: "NEET (UG) previous years",
  },
  {
    id: "UPSC",
    title: "UPSC",
    blurb: "CSE Prelims / CSAT style",
  },
];

export function AdaptivePractice() {
  const dispatch = useDispatch();
  const lifetime = useSelector((s) => s.study.adaptiveStats);
  const practiceIntent = useSelector((s) => s.practiceIntent?.intent);
  const [phase, setPhase] = useState("input");
  const [topicInput, setTopicInput] = useState("");
  const [examTrack, setExamTrack] = useState("JEE");
  const [sessionTopic, setSessionTopic] = useState("");
  const [sessionExamTrack, setSessionExamTrack] = useState("JEE");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const [correctCount, setCorrectCount] = useState(0);
  const [attemptedCount, setAttemptedCount] = useState(0);
  const [wrongItems, setWrongItems] = useState([]);
  const [isMockTestSession, setIsMockTestSession] = useState(false);
  const mockSaveDoneRef = useRef(false);

  // Weak-topic tracking should be conservative: only add to weak list after
  // user gets the same subtopic wrong multiple times in this session.
  const WEAK_TOPIC_INCORRECT_THRESHOLD = 2;
  const wrongCountBySubtopicRef = useRef({}); // { [subKey]: number }
  const weakAddedBySubtopicRef = useRef({}); // { [subKey]: true }

  const question = questions[currentIndex];
  const totalQuestions = questions.length;

  const accuracyPct = useMemo(() => {
    if (attemptedCount < 1) return 0;
    return Math.round((correctCount / attemptedCount) * 100);
  }, [correctCount, attemptedCount]);

  const incorrectCount = attemptedCount - correctCount;

  useEffect(() => {
    const intent = practiceIntent;
    if (!intent?.topicInput?.trim() || !intent?.autoGenerate) return;
    dispatch(clearPracticeIntent());
    setTopicInput(intent.topicInput);
    setExamTrack(intent.examTrack || "JEE");
    handleGenerate({
      topic: intent.topicInput,
      examTrack: intent.examTrack || "JEE",
      mockTest: Boolean(intent.isMockTest),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceIntent]);

  const resetSessionState = () => {
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setCorrectCount(0);
    setAttemptedCount(0);
    setWrongItems([]);
    setSessionTopic("");
    setSessionExamTrack("JEE");
    setIsMockTestSession(false);
    mockSaveDoneRef.current = false;
    wrongCountBySubtopicRef.current = {};
    weakAddedBySubtopicRef.current = {};
  };

  const handleGenerate = async (overrides) => {
    const t = (overrides?.topic ?? topicInput).trim();
    const track = overrides?.examTrack ?? examTrack;
    const mockTest = Boolean(overrides?.mockTest);
    if (!t) return;

    setLoading(true);
    setError(null);
    mockSaveDoneRef.current = false;
    if (overrides) {
      setTopicInput(t);
      setExamTrack(track);
      setIsMockTestSession(mockTest);
    } else {
      setIsMockTestSession(false);
    }

    try {
      const res = await fetch(`${API_BASE}/api/generate-mcq`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, examTrack: track, mockTest }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const list = Array.isArray(data.questions) ? data.questions : [];
      if (list.length < 1) {
        throw new Error("No questions returned — try a different phrasing");
      }

      setSessionTopic(data.topic || t);
      setSessionExamTrack(data.examTrack || track);
      setQuestions(list);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowFeedback(false);
      setCorrectCount(0);
      setAttemptedCount(0);
      setWrongItems([]);
      wrongCountBySubtopicRef.current = {};
      weakAddedBySubtopicRef.current = {};
      setPhase("quiz");
    } catch (err) {
      setError(err.message || "Could not generate questions. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const isCorrect =
    question &&
    selectedAnswer !== null &&
    selectedAnswer === question.correctIndex;

  const handleSubmit = () => {
    if (selectedAnswer === null || showFeedback || !question) return;

    const correct = selectedAnswer === question.correctIndex;

    setCorrectCount((c) => c + (correct ? 1 : 0));
    setAttemptedCount((a) => a + 1);

    if (!correct) {
      const sub = question.subtopic || sessionTopic;
      setWrongItems((prev) => [
        ...prev,
        {
          subtopic: sub,
          question: question.question,
          explanation: question.explanation,
          correctOption: question.options[question.correctIndex],
          sourceLabel: question.sourceLabel || "",
        },
      ]);
      // Increment wrong count; only mark weak after repeated incorrects.
      if (sub) {
        const subLabel = String(sub).trim();
        const subKey = subLabel.toLowerCase();
        wrongCountBySubtopicRef.current[subKey] =
          (wrongCountBySubtopicRef.current[subKey] || 0) + 1;

        const wrongCount =
          wrongCountBySubtopicRef.current[subKey] || 0;

        if (
          wrongCount >= WEAK_TOPIC_INCORRECT_THRESHOLD &&
          !weakAddedBySubtopicRef.current[subKey]
        ) {
          weakAddedBySubtopicRef.current[subKey] = true;
          dispatch(recordPracticeWeakTopics([subLabel]));
        }
      }
    }

    setShowFeedback(true);
  };

  const handleNext = () => {
    if (!showFeedback) return;

    if (currentIndex >= totalQuestions - 1) {
      setPhase("results");
      setSelectedAnswer(null);
      setShowFeedback(false);
      return;
    }

    setCurrentIndex((i) => i + 1);
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  const handleBackToInput = () => {
    setPhase("input");
    resetSessionState();
    setTopicInput("");
  };

  const handleAnswerSelect = (index) => {
    if (showFeedback) return;
    setSelectedAnswer(index);
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-400 bg-green-500/20";
      case "Medium":
        return "text-yellow-400 bg-yellow-500/20";
      case "Hard":
        return "text-red-400 bg-red-500/20";
      default:
        return "text-gray-400 bg-gray-500/20";
    }
  };

  const wrongSubtopicsUnique = useMemo(() => {
    const seen = new Set();
    const list = [];
    wrongItems.forEach((w) => {
      const key = w.subtopic || "General";
      if (!seen.has(key)) {
        seen.add(key);
        list.push(key);
      }
    });
    return list;
  }, [wrongItems]);

  const mockTestScore100 = useMemo(() => {
    if (!isMockTestSession || attemptedCount < 1) return null;
    const wrong = attemptedCount - correctCount;
    return Math.max(0, Math.min(100, correctCount * 4 - wrong));
  }, [isMockTestSession, attemptedCount, correctCount]);

  useEffect(() => {
    if (phase !== "results" || !isMockTestSession || mockTestScore100 == null) return;
    if (mockSaveDoneRef.current) return;
    mockSaveDoneRef.current = true;
    dispatch(setMockTestScore({ score: mockTestScore100 }));
    const s = store.getState();
    saveUserProfile({
      plannerWeakTopics: s.knowledge.plannerWeakTopics,
      spacedWeakTopics: s.knowledge.spacedWeakTopics,
      practiceWeakTopics: s.knowledge.practiceWeakTopics,
      concepts: s.knowledge.concepts,
      adaptiveStats: s.study.adaptiveStats,
      flashcards: s.study.flashcards,
      progressStats: s.progress,
    }).catch(() => {});
  }, [phase, isMockTestSession, mockTestScore100, dispatch]);

  /* ---------- INPUT ---------- */
  if (phase === "input") {
    return (
      <div className="p-8 space-y-6 max-w-4xl">
        <div className="mb-2">
          <h1 className="text-3xl font-semibold text-white mb-2">
            Adaptive Practice
          </h1>
          <p className="text-gray-400">
            Pick an exam track, then enter a topic or chapter. You’ll get 10–15
            PYQ-style MCQs (labeled with exam + year, or “PYQ-style” if not a
            verified past paper). Accuracy updates after each answer.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Lifetime (saved):{" "}
            <span className="text-emerald-400/90">{lifetime.correctTotal}</span>{" "}
            correct ·{" "}
            <span className="text-rose-400/90">{lifetime.incorrectTotal}</span>{" "}
            incorrect — weak topics feed your knowledge graph &amp; spaced review.
          </p>
        </div>

        <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <GraduationCap className="w-4 h-4 text-amber-400" />
            Exam track
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {EXAM_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setExamTrack(opt.id)}
                className={`text-left rounded-xl border px-4 py-3 transition-all ${
                  examTrack === opt.id
                    ? "border-amber-500/60 bg-amber-500/10 ring-1 ring-amber-500/30"
                    : "border-white/10 bg-white/5 hover:border-white/20"
                }`}
              >
                <p className="font-semibold text-white">{opt.title}</p>
                <p className="text-xs text-gray-400 mt-1">{opt.blurb}</p>
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium text-gray-300">
            Topic / chapter / concept
          </label>
          <textarea
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            placeholder="e.g. Thermodynamics, Chemical bonding, Modern Indian History…"
            rows={5}
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50 resize-y min-h-[120px]"
          />
          {error && (
            <p className="text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !topicInput.trim()}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-95"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating quiz…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate 10–15 questions
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  /* ---------- RESULTS ---------- */
  if (phase === "results") {
    const mockScore =
      isMockTestSession && attemptedCount > 0
        ? Math.max(0, Math.min(100, correctCount * 4 - (attemptedCount - correctCount)))
        : null;
    return (
      <div className="p-8 space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Session complete</h1>
          <p className="text-gray-400">
            <span className="text-amber-300 font-medium">{sessionExamTrack}</span> ·{" "}
            Topic: <span className="text-white">{sessionTopic}</span> ·{" "}
            {totalQuestions} questions ·{" "}
            <span className="text-green-400">{accuracyPct}%</span> accuracy (
            {correctCount}/{attemptedCount} correct)
          </p>
          {mockScore != null && (
            <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-6 py-4">
              <p className="text-sm text-amber-200/90 mb-1">Mock test score (100 marks, +4 / −1)</p>
              <p className="text-3xl font-bold text-white">{mockScore} / 100</p>
              <p className="text-xs text-gray-500 mt-2">Saved to your profile for Progress.</p>
            </div>
          )}
        </div>

        <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-8 shadow-lg space-y-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-orange-400" />
            <h2 className="text-xl font-semibold text-white">
              Revise these areas
            </h2>
          </div>

          {wrongItems.length === 0 ? (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-6 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-white font-medium">Perfect score</p>
              <p className="text-sm text-gray-400 mt-1">
                No weak spots flagged for this round.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                Subtopics to revisit:{" "}
                <span className="text-orange-300">
                  {wrongSubtopicsUnique.join(" · ")}
                </span>
              </p>
              <ul className="space-y-4">
                {wrongItems.map((w, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-orange-400 mb-1">
                      {w.subtopic}
                      {w.sourceLabel ? (
                        <span className="text-gray-500 normal-case ml-2">
                          · {w.sourceLabel}
                        </span>
                      ) : null}
                    </p>
                    <p className="text-white text-sm mb-2">{w.question}</p>
                    <p className="text-xs text-gray-500 mb-1">
                      Correct answer:{" "}
                      <span className="text-green-400">{w.correctOption}</span>
                    </p>
                    <p className="text-xs text-gray-400">{w.explanation}</p>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={handleBackToInput}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white"
            >
              <RotateCcw className="w-4 h-4" />
              New topic
            </button>
            <button
              type="button"
              onClick={() => {
                const t = sessionTopic;
                const e = sessionExamTrack;
                resetSessionState();
                setTopicInput(t);
                setExamTrack(e);
                setPhase("input");
              }}
              className="px-5 py-2.5 rounded-lg border border-white/15 text-white hover:bg-white/5"
            >
              Edit topic & regenerate
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- QUIZ ---------- */
  if (!question) {
    return (
      <div className="p-8 text-gray-400">
        No question loaded.{" "}
        <button type="button" className="text-purple-400" onClick={handleBackToInput}>
          Start over
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="mb-2 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">
            Adaptive Practice
          </h1>
          <p className="text-gray-400 text-sm">
            <span className="text-amber-300 font-medium">{sessionExamTrack}</span> ·{" "}
            <span className="text-white/90">{sessionTopic}</span> ·{" "}
            <span className="text-purple-300">{totalQuestions}</span>{" "}
            {isMockTestSession ? "mock test questions (+4/−1)" : "PYQ-style questions"}
          </p>
        </div>
      </div>

      {isMockTestSession && attemptedCount > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-200/90">
          Live mock marks:{" "}
          <span className="font-semibold text-white">
            {Math.max(0, Math.min(100, correctCount * 4 - (attemptedCount - correctCount)))}
          </span>
          /100
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5 shadow-lg">
          <p className="text-sm text-gray-400 mb-1">Accuracy (live)</p>
          <p className="text-2xl font-semibold text-green-400">{accuracyPct}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {correctCount} correct / {attemptedCount} attempted
          </p>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5 shadow-lg">
          <p className="text-sm text-gray-400 mb-1">Progress</p>
          <p className="text-2xl font-semibold text-blue-400">
            {currentIndex + 1} / {totalQuestions}
          </p>
          <p className="text-xs text-gray-500 mt-1">Current question</p>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-5 shadow-lg">
          <p className="text-sm text-gray-400 mb-1">Misses so far</p>
          <p className="text-2xl font-semibold text-red-400">{incorrectCount}</p>
          <p className="text-xs text-gray-500 mt-1">Updates each submit</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-8 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/25">
                    {sessionExamTrack} · PYQ
                  </span>
                  <span className="text-sm text-gray-400">
                    {question.subtopic || sessionTopic}
                  </span>
                </div>
                {question.sourceLabel ? (
                  <p className="text-sm text-amber-200/90 font-medium">
                    {question.sourceLabel}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm shrink-0">
                <Clock className="w-4 h-4" />
                Session
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-400 mb-2">
                Question {currentIndex + 1} of {totalQuestions}
              </p>
              <h2 className="text-xl text-white leading-relaxed">
                {question.question}
              </h2>
            </div>

            <div className="space-y-3 mb-6">
              {question.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = index === question.correctIndex;

                let optionClass = "bg-white/5 border-white/10 hover:border-purple-500/30";

                if (showFeedback) {
                  if (isCorrectAnswer) {
                    optionClass = "bg-green-500/20 border-green-500/50";
                  } else if (isSelected && !isCorrect) {
                    optionClass = "bg-red-500/20 border-red-500/50";
                  }
                } else if (isSelected) {
                  optionClass = "bg-purple-500/20 border-purple-500/50";
                }

                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAnswerSelect(index)}
                    disabled={showFeedback}
                    className={`
                      w-full text-left p-4 rounded-lg border transition-all duration-200
                      ${optionClass}
                      ${!showFeedback ? "hover:bg-white/10 cursor-pointer" : "cursor-not-allowed"}
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white">
                        <span className="text-gray-500 mr-2">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        {option}
                      </span>
                      {showFeedback && isCorrectAnswer && (
                        <CheckCircle className="w-5 h-5 shrink-0 text-green-400" />
                      )}
                      {showFeedback && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 shrink-0 text-red-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {showFeedback && (
              <div
                className={`
                p-4 rounded-lg border mb-6
                ${isCorrect ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}
              `}
              >
                <div className="flex items-center gap-2 mb-2">
                  {isCorrect ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="font-medium text-green-400">Correct</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5 text-red-400" />
                      <span className="font-medium text-red-400">Incorrect</span>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-300">{question.explanation}</p>
              </div>
            )}

            <div className="flex gap-3">
              {!showFeedback ? (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                  className={`
                    flex-1 py-3 rounded-lg transition-all
                    ${selectedAnswer !== null
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:opacity-90"
                      : "bg-white/5 text-gray-500 cursor-not-allowed"
                    }
                  `}
                >
                  Submit answer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  {currentIndex >= totalQuestions - 1
                    ? "View summary"
                    : "Next question"}
                </button>
              )}
            </div>
          </div>

          <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Answered in session</span>
              <span className="text-sm text-white">
                {attemptedCount} / {totalQuestions}
              </span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
                style={{
                  width: `${totalQuestions ? (attemptedCount / totalQuestions) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-semibold text-white">This session</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Correct</span>
                <span className="text-green-400">{correctCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Incorrect</span>
                <span className="text-red-400">{incorrectCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Accuracy</span>
                <span className="text-purple-300">{accuracyPct}%</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-3">
                <span className="text-gray-400">Total questions</span>
                <span className="text-white">{totalQuestions}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Wrong so far</h2>
            </div>
            {wrongItems.length === 0 ? (
              <p className="text-sm text-gray-500">No misses yet — keep going.</p>
            ) : (
              <ul className="space-y-2">
                {wrongSubtopicsUnique.map((s) => (
                  <li
                    key={s}
                    className="text-sm text-orange-300 border border-orange-500/20 rounded-lg px-3 py-2 bg-orange-500/5"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={handleBackToInput}
            className="w-full py-2.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-sm"
          >
            Cancel & new topic
          </button>
        </div>
      </div>
    </div>
  );
}
