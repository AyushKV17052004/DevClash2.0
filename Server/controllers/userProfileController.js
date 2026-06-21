import mongoose from "mongoose";
import { UserProfile } from "../models/UserProfile.js";

const DEFAULT_ID = "default";

function sanitizeStringArray(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.map((s) => String(s ?? "").trim()).filter(Boolean))];
}

export async function getProfile(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database unavailable",
        profile: null,
      });
    }

    const userId = String(req.userId || req.query.userId || DEFAULT_ID).trim() || DEFAULT_ID;

    let doc = await UserProfile.findOne({ userId }).lean();
    if (!doc) {
      const created = await UserProfile.create({
        userId,
        plannerWeakTopics: [],
        spacedWeakTopics: [],
        practiceWeakTopics: [],
        adaptiveStats: { correctTotal: 0, incorrectTotal: 0 },
        concepts: {},
      });
      doc = created.toObject();
    }

    const payload = {
      userId: doc.userId,
      plannerWeakTopics: doc.plannerWeakTopics || [],
      spacedWeakTopics: doc.spacedWeakTopics || [],
      practiceWeakTopics: doc.practiceWeakTopics || [],
      adaptiveStats: {
        correctTotal: Number(doc.adaptiveStats?.correctTotal) || 0,
        incorrectTotal: Number(doc.adaptiveStats?.incorrectTotal) || 0,
      },
      concepts: doc.concepts && typeof doc.concepts === "object" ? doc.concepts : {},
      studyPlan: doc.studyPlan || "",
      studyPlanExamType: doc.studyPlanExamType || "",
      studyPlanExamDate: doc.studyPlanExamDate || "",
      studyPlanChapters: Array.isArray(doc.studyPlanChapters) ? doc.studyPlanChapters : [],
      tutorChatHistory: Array.isArray(doc.tutorChatHistory) ? doc.tutorChatHistory : [],
      progressStats: doc.progressStats && typeof doc.progressStats === "object"
        ? {
            dailyMinutes: doc.progressStats.dailyMinutes && typeof doc.progressStats.dailyMinutes === "object"
              ? doc.progressStats.dailyMinutes
              : {},
            totalStudyMinutes: Math.max(0, Math.floor(Number(doc.progressStats.totalStudyMinutes) || 0)),
            currentStreak: Math.max(0, Math.floor(Number(doc.progressStats.currentStreak) || 0)),
            lastActiveDate: doc.progressStats.lastActiveDate || null,
            lastMockTestScore: doc.progressStats.lastMockTestScore != null ? Math.round(Number(doc.progressStats.lastMockTestScore)) : null,
            lastMockTestDate: doc.progressStats.lastMockTestDate || null,
            bestMockTestScore: Math.max(0, Math.round(Number(doc.progressStats.bestMockTestScore) || 0)),
          }
        : { dailyMinutes: {}, totalStudyMinutes: 0, currentStreak: 0, lastActiveDate: null, lastMockTestScore: null, lastMockTestDate: null, bestMockTestScore: 0 },
      updatedAt: doc.updatedAt,
    };
    if (doc.flashcards != null) {
      payload.flashcards = doc.flashcards;
    }
    return res.json(payload);
  } catch (err) {
    console.error("getProfile:", err);
    return res.status(500).json({ error: err.message || "Failed to load profile" });
  }
}

export async function putProfile(req, res) {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Database unavailable" });
    }

    const userId = String(req.userId || req.body?.userId || DEFAULT_ID).trim() || DEFAULT_ID;

    const plannerWeakTopics = sanitizeStringArray(req.body?.plannerWeakTopics);
    const spacedWeakTopics = sanitizeStringArray(req.body?.spacedWeakTopics);
    const practiceWeakTopics = sanitizeStringArray(req.body?.practiceWeakTopics);

    const c = req.body?.adaptiveStats?.correctTotal;
    const ic = req.body?.adaptiveStats?.incorrectTotal;
    const adaptiveStats = {
      correctTotal: Math.max(0, Math.floor(Number(c) || 0)),
      incorrectTotal: Math.max(0, Math.floor(Number(ic) || 0)),
    };

    const concepts =
      req.body?.concepts && typeof req.body.concepts === "object"
        ? req.body.concepts
        : {};

    const update = {
      plannerWeakTopics,
      spacedWeakTopics,
      practiceWeakTopics,
      adaptiveStats,
      concepts,
      studyPlan: String(req.body?.studyPlan ?? "").trim(),
      studyPlanExamType: String(req.body?.studyPlanExamType ?? "").trim(),
      studyPlanExamDate: String(req.body?.studyPlanExamDate ?? "").trim(),
      studyPlanChapters: Array.isArray(req.body?.studyPlanChapters) ? req.body.studyPlanChapters : [],
      tutorChatHistory: Array.isArray(req.body?.tutorChatHistory) ? req.body.tutorChatHistory : [],
    };
    if (Array.isArray(req.body?.flashcards)) {
      update.flashcards = req.body.flashcards;
    }
    if (req.body?.progressStats && typeof req.body.progressStats === "object") {
      const ps = req.body.progressStats;
      update.progressStats = {
        dailyMinutes: ps.dailyMinutes && typeof ps.dailyMinutes === "object" ? ps.dailyMinutes : {},
        totalStudyMinutes: Math.max(0, Math.floor(Number(ps.totalStudyMinutes) || 0)),
        currentStreak: Math.max(0, Math.floor(Number(ps.currentStreak) || 0)),
        lastActiveDate: ps.lastActiveDate || null,
        lastMockTestScore: ps.lastMockTestScore != null ? Math.max(0, Math.min(100, Math.round(Number(ps.lastMockTestScore)))) : null,
        lastMockTestDate: ps.lastMockTestDate || null,
        bestMockTestScore: Math.max(0, Math.min(100, Math.round(Number(ps.bestMockTestScore) || 0))),
      };
    }

    const doc = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      ok: true,
      userId: doc.userId,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error("putProfile:", err);
    return res.status(500).json({ error: err.message || "Failed to save profile" });
  }
}
