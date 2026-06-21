import mongoose from "mongoose";

/**
 * Single-learner profile (default userId). Stores weak topics, SM-2 concepts,
 * flashcards, and adaptive practice totals for cross-session persistence.
 */
const userProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      default: "default",
      index: true,
    },
    plannerWeakTopics: { type: [String], default: [] },
    spacedWeakTopics: { type: [String], default: [] },
    practiceWeakTopics: { type: [String], default: [] },
    adaptiveStats: {
      correctTotal: { type: Number, default: 0 },
      incorrectTotal: { type: Number, default: 0 },
    },
    tutorChatHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
    studyPlan: { type: String, default: "" },
    studyPlanChapters: { type: [mongoose.Schema.Types.Mixed], default: [] },
    studyPlanExamType: { type: String, default: "" },
    studyPlanExamDate: { type: String, default: "" },
    /** slug -> concept document for forgetting curve (SM-2) */
    concepts: { type: mongoose.Schema.Types.Mixed, default: {} },
    /** Omitted until first save — avoids wiping client preload deck on empty DB */
    flashcards: { type: mongoose.Schema.Types.Mixed },
    /** Study time tracking: { "YYYY-MM-DD": minutes }, totalStudyMinutes, currentStreak, lastActiveDate */
    progressStats: {
      dailyMinutes: { type: mongoose.Schema.Types.Mixed, default: {} },
      totalStudyMinutes: { type: Number, default: 0 },
      currentStreak: { type: Number, default: 0 },
      lastActiveDate: { type: String, default: null },
      lastMockTestScore: { type: Number, default: null },
      lastMockTestDate: { type: String, default: null },
      bestMockTestScore: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export const UserProfile =
  mongoose.models.UserProfile || mongoose.model("UserProfile", userProfileSchema);
