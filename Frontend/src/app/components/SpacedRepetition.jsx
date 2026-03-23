import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  RotateCcw,
  Clock,
  Brain,
  Sparkles,
  Network,
  X,
} from "lucide-react";
import { addGeneratedCards, removeFlashcardById } from "../../redux/studySlice";
import { store } from "../../redux/store";
import {
  selectMergedWeakTopics,
  recordConceptReview,
  registerConceptExposure,
  addSpacedWeakTopics,
  removeWeakTopicPermanently,
} from "../../redux/knowledgeGraphSlice";
import { API_BASE } from "../../config/api";

export function SpacedRepetition() {
  const dispatch = useDispatch();
  const weakTopics = useSelector(selectMergedWeakTopics);

  const [topic, setTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [error, setError] = useState(null);

  const flashcards = useSelector((state) => state.study.flashcards) || [];
  const concepts = useSelector((state) => state.knowledge?.concepts || {});

  const upcomingReviews = Object.values(concepts)
    .filter((c) => c.nextReview)
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))
    .slice(0, 6);

  const avgStrength =
    Object.keys(concepts).length > 0
      ? Math.round(
          Object.values(concepts).reduce((s, c) => s + (c.strength || 0), 0) /
            Object.keys(concepts).length
        )
      : 72;

  const handleGenerateForTopic = async (trimmed) => {
    if (!trimmed) return;
    setIsGenerating(true);
    setError(null);
    const previousCount = flashcards.length;
    try {
      const res = await fetch(`${API_BASE}/api/generate-cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }
      const cards = Array.isArray(data.cards) ? data.cards : [];
      if (cards.length === 0) {
        throw new Error("No cards returned — try a different phrasing");
      }
      const withSubject = cards.map((c) => ({
        ...c,
        subject: (c.subject || trimmed).trim(),
      }));
      dispatch(addGeneratedCards(withSubject));
      dispatch(registerConceptExposure(trimmed));
      dispatch(addSpacedWeakTopics([trimmed]));
      setCurrentCardIdx(previousCount);
      setShowAnswer(false);
    } catch (err) {
      setError(err.message || "Could not generate cards.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeCard = flashcards[currentCardIdx];

  const handleGenerate = async () => {
    const trimmed = topic.trim();
    if (!trimmed) return;
    setTopic("");
    await handleGenerateForTopic(trimmed);
  };

  const onDifficulty = (quality) => {
    const label = activeCard?.subject || "General";
    const id = activeCard?.id;
    const idx = currentCardIdx;
    dispatch(recordConceptReview({ topicLabel: label, quality }));
    if (id) {
      dispatch(removeFlashcardById(id));
      queueMicrotask(() => {
        const len = store.getState().study.flashcards.length;
        if (len === 0) {
          setCurrentCardIdx(0);
        } else {
          setCurrentCardIdx(Math.min(idx, len - 1));
        }
      });
    } else {
      setCurrentCardIdx((i) => (i + 1) % Math.max(1, flashcards.length));
    }
    setShowAnswer(false);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">
            AI Knowledge Graph
          </h1>
          <p className="text-gray-400">
            Tracks concepts with a forgetting curve (SM-2). Weak topics from your
            planner &amp; practice appear below — tap to generate cards.
          </p>
        </div>

        {weakTopics.length > 0 && (
          <div className="w-full max-w-3xl space-y-2">
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Network className="w-3.5 h-3.5" />
              Weak topics — tap to practice, cut to permanently remove
            </p>
            <div className="flex flex-wrap gap-2">
              {weakTopics.map((t) => (
                <div
                  key={t}
                  className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-200 group"
                >
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={() => handleGenerateForTopic(t)}
                    className="text-xs px-3 py-1.5 hover:bg-orange-500/20 disabled:opacity-50 rounded-l-full"
                  >
                    {t}
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatch(removeWeakTopicPermanently(t))}
                    className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/20 rounded-r-full border-l border-orange-500/20"
                    title="Permanently remove from weak topics"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2 w-full max-w-md">
          <div className="flex gap-2 bg-[#1a1a2e] p-2 rounded-xl border border-white/10">
            <input
              type="text"
              placeholder="Enter topic (e.g. React Hooks)..."
              className="bg-transparent border-none outline-none text-white px-3 flex-1 text-sm"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleGenerate();
              }}
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white p-2 rounded-lg transition-all"
              title="Generate with AI"
            >
              {isGenerating ? (
                <RotateCcw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-400 px-1" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {flashcards.length > 0 ? (
            <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-8 shadow-lg min-h-[500px] flex flex-col">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-400" />
                  <span className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    {activeCard?.subject}
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  Card {currentCardIdx + 1} of {flashcards.length}
                </span>
              </div>

              <div
                className="flex-1 min-h-[300px] flashcard-scene cursor-pointer"
                onClick={() => setShowAnswer(!showAnswer)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setShowAnswer((v) => !v);
                  }
                }}
              >
                <div
                  className={`flashcard-inner ${showAnswer ? "is-flipped" : ""}`}
                >
                  <div className="flashcard-face flex flex-col items-center justify-center bg-gradient-to-br from-purple-500/5 to-blue-500/5 border border-white/5 rounded-2xl p-10">
                    <p className="text-xs text-purple-400 font-bold mb-4 uppercase">
                      Question
                    </p>
                    <h2 className="text-2xl md:text-3xl text-white text-center font-light leading-relaxed">
                      {activeCard?.question}
                    </h2>
                    <p className="text-gray-500 text-sm mt-12 animate-pulse">
                      Click to flip
                    </p>
                  </div>

                  <div className="flashcard-face flashcard-face--back flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-2xl p-10">
                    <p className="text-xs text-green-400 font-bold mb-4 uppercase">
                      Suggested Answer
                    </p>
                    <h2 className="text-xl md:text-2xl text-white text-center whitespace-pre-wrap">
                      {activeCard?.answer}
                    </h2>
                  </div>
                </div>
              </div>

              <div
                className={`grid grid-cols-3 gap-3 mt-8 transition-opacity duration-300 ${showAnswer ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDifficulty(0);
                  }}
                  className="py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-bold uppercase"
                >
                  Again
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDifficulty(2);
                  }}
                  className="py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 hover:bg-yellow-500/20 text-xs font-bold uppercase"
                >
                  Hard
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDifficulty(4);
                  }}
                  className="py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 text-xs font-bold uppercase"
                >
                  Easy
                </button>
              </div>
            </div>
          ) : (
            <div className="h-[500px] border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-gray-500">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p>Enter a topic above to generate your first AI study deck</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Next revision (SM-2)
            </h2>
            <div className="space-y-3">
              {upcomingReviews.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Review flashcards with Again/Hard/Easy to populate your graph.
                </p>
              ) : (
                upcomingReviews.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 bg-white/5 rounded-lg border border-white/5"
                  >
                    <p className="text-sm text-white">{c.label}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      Due {new Date(c.nextReview).toLocaleString()} · strength{" "}
                      {c.strength}%
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 p-6 rounded-xl">
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm text-gray-400">Graph avg strength</span>
              <span className="text-xl font-bold text-green-400">{avgStrength}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, avgStrength)}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
