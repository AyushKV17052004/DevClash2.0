import { createSlice } from "@reduxjs/toolkit";
import { slugifyTopic, applySm2Step } from "../lib/forgettingCurve";

function ensureConcept(state, label, source) {
  const slug = slugifyTopic(label);
  if (!slug || slug === "topic") return null;
  if (!state.concepts[slug]) {
    state.concepts[slug] = {
      id: slug,
      label: String(label).trim(),
      easeFactor: 2.5,
      intervalDays: 1,
      repetitions: 0,
      lastReviewed: null,
      nextReview: new Date().toISOString(),
      strength: 35,
      sources: { planner: false, practice: false, manual: false, spaced: false },
      studyEvents: 0,
    };
  }
  if (source === "planner") state.concepts[slug].sources.planner = true;
  if (source === "practice") state.concepts[slug].sources.practice = true;
  if (source === "manual") state.concepts[slug].sources.manual = true;
  if (source === "spaced") state.concepts[slug].sources.spaced = true;
  return state.concepts[slug];
}

const initialState = {
  concepts: {},
  /** @type {string[]} */
  plannerWeakTopics: [],
  /** Topics added from Spaced Repetition search */
  spacedWeakTopics: [],
  /** @type {string[]} */
  practiceWeakTopics: [],
};

export const knowledgeGraphSlice = createSlice({
  name: "knowledge",
  initialState,
  reducers: {
    /** Chapters marked Weak in Study Planner (merged on sync) */
    syncPlannerWeakTopics: (state, action) => {
      const list = Array.isArray(action.payload) ? action.payload : [];
      const uniq = new Set(
        [...state.plannerWeakTopics, ...list]
          .map((s) => String(s || "").trim())
          .filter(Boolean)
      );
      state.plannerWeakTopics = [...uniq];
      uniq.forEach((label) => ensureConcept(state, label, "planner"));
    },

    /** Wrong subtopics from Adaptive Practice */
    recordPracticeWeakTopics: (state, action) => {
      const list = Array.isArray(action.payload) ? action.payload : [];
      const uniq = new Set(
        [...state.practiceWeakTopics, ...list]
          .map((s) => String(s || "").trim())
          .filter(Boolean)
      );
      state.practiceWeakTopics = [...uniq];
      uniq.forEach((label) => ensureConcept(state, label, "practice"));
    },

    /** Replace planner weak topics (e.g. after save completed — only Weak chapters remain) */
    replacePlannerWeakTopics: (state, action) => {
      const list = Array.isArray(action.payload) ? action.payload : [];
      state.plannerWeakTopics = list
        .map((s) => String(s || "").trim())
        .filter(Boolean);
    },

    /** Remove completed topics from planner weak — they're no longer weak */
    removeCompletedTopics: (state, action) => {
      const toRemove = new Set(
        (Array.isArray(action.payload) ? action.payload : [])
          .map((s) => String(s || "").trim().toLowerCase())
          .filter(Boolean)
      );
      state.plannerWeakTopics = state.plannerWeakTopics.filter(
        (t) => !toRemove.has(String(t).trim().toLowerCase())
      );
      Object.keys(state.concepts).forEach((slug) => {
        const c = state.concepts[slug];
        const labelLower = (c?.label || "").trim().toLowerCase();
        if (toRemove.has(labelLower) && c?.sources?.planner) {
          delete state.concepts[slug];
        }
      });
    },

    /** Permanently remove a weak topic from all arrays and concepts */
    removeWeakTopicPermanently: (state, action) => {
      const label = String(action.payload || "").trim();
      const lower = label.toLowerCase();
      const norm = (t) => String(t).trim().toLowerCase();
      state.plannerWeakTopics = state.plannerWeakTopics.filter((t) => norm(t) !== lower);
      state.spacedWeakTopics = state.spacedWeakTopics.filter((t) => norm(t) !== lower);
      state.practiceWeakTopics = state.practiceWeakTopics.filter((t) => norm(t) !== lower);
      const slug = slugifyTopic(label);
      if (slug && state.concepts[slug]) delete state.concepts[slug];
    },

    /** Topics searched / generated in Spaced Repetition — merged into weak-topic buttons */
    addSpacedWeakTopics: (state, action) => {
      const list = Array.isArray(action.payload) ? action.payload : [action.payload];
      const uniq = new Set(
        [...state.spacedWeakTopics, ...list]
          .map((s) => String(s || "").trim())
          .filter(Boolean)
      );
      state.spacedWeakTopics = [...uniq];
      uniq.forEach((label) => ensureConcept(state, label, "spaced"));
    },

    /** Full replace from MongoDB (GET /api/user/profile) */
    hydrateKnowledgeFromServer: (state, action) => {
      const p = action.payload;
      if (!p || typeof p !== "object") return;
      if (Array.isArray(p.plannerWeakTopics)) state.plannerWeakTopics = [...p.plannerWeakTopics];
      if (Array.isArray(p.spacedWeakTopics)) state.spacedWeakTopics = [...p.spacedWeakTopics];
      if (Array.isArray(p.practiceWeakTopics)) state.practiceWeakTopics = [...p.practiceWeakTopics];
      if (p.concepts && typeof p.concepts === "object") state.concepts = p.concepts;
    },

    /** Flashcard review: quality 0=Again, 2=Hard, 4=Easy */
    recordConceptReview: (state, action) => {
      const { topicLabel, quality } = action.payload;
      const c = ensureConcept(state, topicLabel, "manual");
      if (!c) return;
      const next = applySm2Step(
        {
          easeFactor: c.easeFactor,
          intervalDays: c.intervalDays,
          repetitions: c.repetitions,
        },
        quality
      );
      c.easeFactor = next.easeFactor;
      c.intervalDays = next.intervalDays;
      c.repetitions = next.repetitions;
      c.nextReview = next.nextReview;
      c.strength = next.strength;
      c.lastReviewed = new Date().toISOString();
      c.studyEvents += 1;
    },

    /** When user generates cards for a topic */
    registerConceptExposure: (state, action) => {
      const label = String(action.payload || "").trim();
      if (!label) return;
      const c = ensureConcept(state, label, "manual");
      if (c) c.studyEvents += 1;
    },

    resetKnowledgeGraph: () => initialState,
  },
});

export const {
  syncPlannerWeakTopics,
  replacePlannerWeakTopics,
  removeCompletedTopics,
  removeWeakTopicPermanently,
  recordPracticeWeakTopics,
  addSpacedWeakTopics,
  hydrateKnowledgeFromServer,
  recordConceptReview,
  registerConceptExposure,
  resetKnowledgeGraph,
} = knowledgeGraphSlice.actions;

export default knowledgeGraphSlice.reducer;

export function selectMergedWeakTopics(state) {
  const k = state.knowledge;
  const set = new Set([
    ...k.plannerWeakTopics,
    ...k.spacedWeakTopics,
    ...k.practiceWeakTopics,
    ...Object.values(k.concepts || {})
      .filter((c) => c.strength < 55)
      .map((c) => c.label),
  ]);
  return [...set].filter(Boolean);
}

export function selectConceptsSortedByStrength(state) {
  return Object.values(state.knowledge.concepts || {}).sort(
    (a, b) => a.strength - b.strength
  );
}
