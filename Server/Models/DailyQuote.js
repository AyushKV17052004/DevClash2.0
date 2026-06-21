import mongoose from "mongoose";

const dailyQuoteSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 280, index: true },
  },
  { timestamps: true }
);

export const DailyQuote =
  mongoose.models.DailyQuote ||
  mongoose.model("DailyQuote", dailyQuoteSchema);

export const DEFAULT_DAILY_QUOTES = [
  "Small steps every day add up to big results.",
  "Discipline beats motivation—show up and keep going.",
  "Consistency turns practice into confidence.",
  "Mistakes are lessons in disguise—analyze and improve.",
  "You don’t rise to the level of goals; you fall to the level of systems.",
  "Focus on progress, not perfection.",
  "Hard work today builds strength for tomorrow.",
  "Stay calm, read carefully, and think step by step.",
  "Every question you attempt makes you stronger.",
  "Believe in the process—your effort will show.",
];

