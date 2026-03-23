import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  scheduledBlocks: [
    { 
      id: 1, 
      day: 1, 
      time: 2, 
      subject: 'Physics', 
      duration: 2, 
      color: 'from-blue-500 to-cyan-500', 
      topicId: 'phys_01' 
    },
  ],

  // 🔥 PRELOADED FLASHCARDS (UI WILL ALWAYS SHOW)
  flashcards: [
    {
      id: crypto.randomUUID(),
      question: "What is React?",
      answer: "A JavaScript library for building user interfaces",
      subject: "React",
      nextReviewDate: new Date().toISOString(),
      interval: 1,
      easeFactor: 2.5
    },
    {
      id: crypto.randomUUID(),
      question: "What is a closure in JavaScript?",
      answer: "A function that remembers variables from its outer scope",
      subject: "JavaScript",
      nextReviewDate: new Date().toISOString(),
      interval: 1,
      easeFactor: 2.5
    },
    {
      id: crypto.randomUUID(),
      question: "What is useEffect?",
      answer: "A React hook used for handling side effects like API calls",
      subject: "React",
      nextReviewDate: new Date().toISOString(),
      interval: 1,
      easeFactor: 2.5
    },
    {
      id: crypto.randomUUID(),
      question: "What is time complexity?",
      answer: "It measures how the runtime of an algorithm grows with input size",
      subject: "DSA",
      nextReviewDate: new Date().toISOString(),
      interval: 1,
      easeFactor: 2.5
    },
    {
      id: crypto.randomUUID(),
      question: "What is a database index?",
      answer: "A data structure that improves query performance",
      subject: "DBMS",
      nextReviewDate: new Date().toISOString(),
      interval: 1,
      easeFactor: 2.5
    }
  ],

  suggestions: [
    { id: 's1', subject: 'Calculus Review', time: '45 min', reason: 'Weak area detected' },
  ],

  stats: {
    totalHours: 2,
    completedSessions: 0,
    totalSessions: 1,
    focusScore: 87
  },

  /** Lifetime totals from Adaptive Practice (synced to MongoDB) */
  adaptiveStats: {
    correctTotal: 0,
    incorrectTotal: 0,
  },
};

export const studySlice = createSlice({
  name: 'study',
  initialState,
  reducers: {

    // ➕ Add new study block
    addBlock: (state, action) => {
      const { day, time, subject, duration, color } = action.payload;

      const newBlock = {
        id: Date.now(),
        day: parseInt(day),
        time: parseInt(time),
        subject,
        duration: parseFloat(duration) || 1,
        color: color || 'from-indigo-500 to-blue-500',
        lastReviewed: null,
        mastery: 0
      };

      state.scheduledBlocks.push(newBlock);

      state.stats.totalHours += newBlock.duration;
      state.stats.totalSessions += 1;
    },

    // ❌ Delete block
    deleteBlock: (state, action) => {
      const blockToDelete = state.scheduledBlocks.find(b => b.id === action.payload);

      if (blockToDelete) {
        state.stats.totalHours -= blockToDelete.duration;
        state.stats.totalSessions -= 1;
      }

      state.scheduledBlocks = state.scheduledBlocks.filter(b => b.id !== action.payload);
    },

    // 🤖 Add AI-generated flashcards (from /api/generate-cards)
    addGeneratedCards: (state, action) => {
      const raw = action.payload;
      const list = Array.isArray(raw) ? raw : [];
      const newCards = list.map((card) => ({
        question: String(card?.question ?? "").trim(),
        answer: String(card?.answer ?? "").trim(),
        subject: String(card?.subject ?? "").trim() || "General",
        type: card?.type,
        id: crypto.randomUUID(),
        nextReviewDate: new Date().toISOString(),
        interval: 1,
        easeFactor: 2.5,
      })).filter((c) => c.question && c.answer);

      state.flashcards.push(...newCards);
    },

    // 🔄 Update card after review
    updateCardInterval: (state, action) => {
      const { cardId, nextInterval, newEase } = action.payload;

      const card = state.flashcards.find(c => c.id === cardId);

      if (card) {
        card.interval = nextInterval;
        card.easeFactor = newEase;
      }
    },

    // ❌ Remove suggestion
    removeSuggestion: (state, action) => {
      state.suggestions = state.suggestions.filter(s => s.id !== action.payload);
    },

    // 📊 Update focus score
    updateFocusScore: (state, action) => {
      state.stats.focusScore = action.payload;
    },

    incrementAdaptiveStats: (state, action) => {
      const correct = Boolean(action.payload?.correct);
      if (correct) state.adaptiveStats.correctTotal += 1;
      else state.adaptiveStats.incorrectTotal += 1;
    },

    /** Remove flashcard after spaced-repetition review (not persisted next session) */
    removeFlashcardById: (state, action) => {
      const id = action.payload;
      state.flashcards = state.flashcards.filter((c) => c.id !== id);
    },

    hydrateStudyFromServer: (state, action) => {
      const p = action.payload;
      if (!p || typeof p !== "object") return;
      if (Array.isArray(p.flashcards)) {
        state.flashcards = p.flashcards;
      }
      if (p.adaptiveStats && typeof p.adaptiveStats === "object") {
        state.adaptiveStats = {
          correctTotal: Math.max(0, Math.floor(Number(p.adaptiveStats.correctTotal) || 0)),
          incorrectTotal: Math.max(0, Math.floor(Number(p.adaptiveStats.incorrectTotal) || 0)),
        };
      }
    },
  },
});

export const {
  addBlock,
  deleteBlock,
  addGeneratedCards,
  updateCardInterval,
  removeSuggestion,
  updateFocusScore,
  incrementAdaptiveStats,
  removeFlashcardById,
  hydrateStudyFromServer,
} = studySlice.actions;

export default studySlice.reducer;