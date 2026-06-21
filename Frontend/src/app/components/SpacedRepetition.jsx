import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RotateCcw, Clock, Brain, Network, X, Loader2 } from "lucide-react";
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
import { AILoader } from "./AILoader";

const CARD = { border: "2px solid var(--border-hard)", borderRadius: "4px", background: "var(--card)", padding: "1.5rem" };

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
      ? Math.round(Object.values(concepts).reduce((s, c) => s + (c.strength || 0), 0) / Object.keys(concepts).length)
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
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
      const cards = Array.isArray(data.cards) ? data.cards : [];
      if (cards.length === 0) throw new Error("No cards returned — try a different phrasing");
      const withSubject = cards.map((c) => ({ ...c, subject: (c.subject || trimmed).trim() }));
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
        setCurrentCardIdx(len === 0 ? 0 : Math.min(idx, len - 1));
      });
    } else {
      setCurrentCardIdx((i) => (i + 1) % Math.max(1, flashcards.length));
    }
    setShowAnswer(false);
  };

  return (
    <div className="p-8 space-y-6 relative overflow-hidden">
      {/* Stickers */}
      <div className="sticker sticker-slow" style={{ top: "4%", right: "2%", fontSize: "2.5rem", "--sticker-rot": "-10deg" }}>🧠</div>
      <div className="sticker sticker-drift" style={{ bottom: "15%", right: "3%", fontSize: "2rem", "--sticker-rot": "8deg", animationDelay: "1s" }}>🃏</div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1 h-8 rounded-full" style={{ background: "#C0392B" }} />
            <h1 className="text-3xl font-black text-foreground" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
              Spaced Repetition
            </h1>
          </div>
          <p className="text-sm text-muted-foreground ml-4">
            Flashcards with SM-2 memory algorithm. Weak topics from planner &amp; practice appear below — tap to generate cards.
          </p>
        </div>

        {/* Topic input */}
        <div className="flex flex-col gap-2 w-full max-w-md shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter topic (e.g. Thermodynamics)…"
              className="flex-1 px-3 py-2.5 text-sm text-foreground outline-none focus:border-[#C0392B] transition-colors"
              style={{ background: "var(--input-background)", border: "2px solid var(--border-hard)", borderRadius: "4px" }}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
            />
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="px-4 py-2 text-white text-sm font-bold disabled:opacity-50 transition-all hover:opacity-90"
              style={{ background: "#C0392B", borderRadius: "4px" }}
              title="Generate cards"
            >
              {isGenerating ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            </button>
          </div>
          {error && (
            <p className="text-sm font-medium" style={{ color: "#C0392B" }} role="alert">⚠ {error}</p>
          )}
        </div>
      </div>

      {/* Weak topics */}
      {weakTopics.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
            <Network className="w-3.5 h-3.5" />
            Weak topics — tap to generate cards, × to remove
          </p>
          <div className="flex flex-wrap gap-2">
            {weakTopics.map((t) => (
              <div
                key={t}
                className="inline-flex items-center"
                style={{ border: "2px solid #E67E22", borderRadius: "4px", overflow: "hidden" }}
              >
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => handleGenerateForTopic(t)}
                  className="text-xs px-3 py-1.5 font-medium disabled:opacity-50 transition-colors"
                  style={{ background: "#E67E22", color: "#fff" }}
                >
                  {t}
                </button>
                <button
                  type="button"
                  onClick={() => dispatch(removeWeakTopicPermanently(t))}
                  className="px-2 py-1.5 transition-colors hover:bg-[#C0392B]"
                  style={{ background: "#1B2540", color: "rgba(255,255,255,0.6)", borderLeft: "1px solid rgba(255,255,255,0.15)" }}
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flashcard */}
        <div className="lg:col-span-2">
          {isGenerating ? (
            <AILoader />
          ) : flashcards.length > 0 ? (
            <div style={{ ...CARD, minHeight: "500px", display: "flex", flexDirection: "column" }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0" style={{ background: "#1B2540", borderRadius: "4px" }}>
                    <Brain className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {activeCard?.subject}
                  </span>
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Card {currentCardIdx + 1} of {flashcards.length}
                </span>
              </div>

              <div
                className="flex-1 min-h-[300px] flashcard-scene cursor-pointer"
                onClick={() => setShowAnswer(!showAnswer)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setShowAnswer((v) => !v); } }}
              >
                <div className={`flashcard-inner ${showAnswer ? "is-flipped" : ""}`}>
                  {/* Front */}
                  <div
                    className="flashcard-face flex flex-col items-center justify-center p-10"
                    style={{ border: "2px solid #1B2540", borderRadius: "4px", background: "#1B2540" }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "#C0392B" }}>
                      Question
                    </p>
                    <h2 className="text-2xl md:text-3xl text-white text-center font-light leading-relaxed" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
                      {activeCard?.question}
                    </h2>
                    <p className="text-sm mt-10 animate-pulse" style={{ color: "rgba(255,255,255,0.4)" }}>
                      Click to flip
                    </p>
                  </div>

                  {/* Back */}
                  <div
                    className="flashcard-face flashcard-face--back flex flex-col items-center justify-center p-10"
                    style={{ border: "2px solid #1E8449", borderRadius: "4px", background: "var(--card)" }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-4" style={{ color: "#1E8449" }}>
                      Answer
                    </p>
                    <h2 className="text-xl md:text-2xl text-foreground text-center whitespace-pre-wrap" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
                      {activeCard?.answer}
                    </h2>
                  </div>
                </div>
              </div>

              <div className={`grid grid-cols-3 gap-3 mt-6 transition-opacity duration-300 ${showAnswer ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDifficulty(0); }}
                  className="py-3 text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90"
                  style={{ border: "2px solid #C0392B", borderRadius: "4px", background: "#C0392B", color: "#fff" }}
                >
                  Again
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDifficulty(2); }}
                  className="py-3 text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90"
                  style={{ border: "2px solid #E67E22", borderRadius: "4px", background: "#E67E22", color: "#fff" }}
                >
                  Hard
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDifficulty(4); }}
                  className="py-3 text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90"
                  style={{ border: "2px solid #1E8449", borderRadius: "4px", background: "#1E8449", color: "#fff" }}
                >
                  Easy
                </button>
              </div>
            </div>
          ) : (
            <div
              className="p-8 flex flex-col justify-center"
              style={{
                border: "2px dashed var(--border-hard)",
                borderRadius: "4px",
                background: "var(--card)",
                minHeight: "500px",
              }}
            >
              <div className="text-center mb-6">
                <span className="text-5xl mb-2 select-none block">🃏</span>
                <h3 className="text-lg font-black text-foreground uppercase tracking-wider" style={{ fontFamily: "'Merriweather', Georgia, serif" }}>
                  How Spaced Repetition Works
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  Unlock active recall and long-term memory retrieval using the scientifically proven SM-2 learning algorithm.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mt-2">
                <div className="p-4 border-2 bg-muted/20" style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}>
                  <p className="text-xs font-bold uppercase tracking-wider text-accent mb-1">1. Create Decks</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Type a topic above (e.g. <i>"Thermodynamics"</i>) and hit generate, or tap any of your flagged weak topics below to construct a deck of 5 dynamic concept cards.
                  </p>
                </div>

                <div className="p-4 border-2 bg-muted/20" style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}>
                  <p className="text-xs font-bold uppercase tracking-wider text-accent2 mb-1">2. Flip & Recall</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Read the question front, formulate your answer, and click the card to flip it over to reveal the explanation.
                  </p>
                </div>

                <div className="p-4 border-2 bg-muted/20" style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}>
                  <p className="text-xs font-bold uppercase tracking-wider text-accent3 mb-1">3. Grade Your Recall</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Rate the card as <b>Again</b>, <b>Hard</b>, or <b>Easy</b> based on how well you recalled the concept.
                  </p>
                </div>

                <div className="p-4 border-2 bg-muted/20" style={{ borderColor: "var(--border-hard)", borderRadius: "4px" }}>
                  <p className="text-xs font-bold uppercase tracking-wider text-accent4 mb-1">4. Intelligent Intervals</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    The SM-2 algorithm schedules weak cards for sooner reviews and pushes known ones further out, locking them in.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div style={CARD}>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: "#2471A3" }} />
              Next review (SM-2)
            </h2>
            <div className="space-y-2">
              {upcomingReviews.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Rate cards with Again / Hard / Easy to build your schedule.
                </p>
              ) : (
                upcomingReviews.map((c) => (
                  <div
                    key={c.id}
                    className="p-3"
                    style={{ border: "1px solid var(--border)", borderRadius: "4px", background: "var(--muted)" }}
                  >
                    <p className="text-sm font-medium text-foreground">{c.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Due {new Date(c.nextReview).toLocaleString()} · strength {c.strength}%
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              border: "2px solid #1E8449",
              borderRadius: "4px",
              background: "var(--card)",
              padding: "1.25rem",
              boxShadow: "3px 3px 0 #1E8449",
            }}
          >
            <div className="flex justify-between items-end mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Knowledge strength</span>
              <span className="text-2xl font-black" style={{ color: "#1E8449", fontFamily: "'Merriweather', Georgia, serif" }}>
                {avgStrength}%
              </span>
            </div>
            <div className="w-full h-2 rounded-full" style={{ background: "var(--border)" }}>
              <div
                className="h-full transition-all"
                style={{ width: `${Math.min(100, avgStrength)}%`, background: "#1E8449", borderRadius: "2px" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
