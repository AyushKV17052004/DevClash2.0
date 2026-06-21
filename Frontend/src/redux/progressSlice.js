import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  dailyMinutes: {},
  totalStudyMinutes: 0,
  currentStreak: 0,
  lastActiveDate: null,
  lastMockTestScore: null,
  lastMockTestDate: null,
  bestMockTestScore: 0,
};

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

function computeStreak(dailyMinutes, upToDate) {
  const key = toDateKey(upToDate);
  if (!dailyMinutes[key] || dailyMinutes[key] < 1) return 0;
  let streak = 0;
  const d = new Date(upToDate);
  while (true) {
    const k = toDateKey(d);
    if ((dailyMinutes[k] || 0) < 1) break;
    streak += 1;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export const progressSlice = createSlice({
  name: "progress",
  initialState,
  reducers: {
    /** Add study minutes for today and update streak */
    addStudyMinutes: (state, action) => {
      const minutes = Math.max(0, Math.floor(Number(action.payload) || 0));
      if (minutes < 1) return;
      const today = toDateKey(new Date());
      state.dailyMinutes[today] = (state.dailyMinutes[today] || 0) + minutes;
      state.totalStudyMinutes += minutes;
      state.lastActiveDate = today;
      state.currentStreak = computeStreak(state.dailyMinutes, new Date());
    },

    setMockTestScore: (state, action) => {
      const score = Math.max(0, Math.min(100, Math.round(Number(action.payload?.score) || 0)));
      state.lastMockTestScore = score;
      state.lastMockTestDate = new Date().toISOString().slice(0, 10);
      if (score > (state.bestMockTestScore || 0)) state.bestMockTestScore = score;
    },

    /** Full replace from MongoDB (GET /api/user/profile) */
    hydrateProgressFromServer: (state, action) => {
      const p = action.payload;
      if (!p || typeof p !== "object") return;
      if (p.dailyMinutes && typeof p.dailyMinutes === "object") {
        state.dailyMinutes = { ...p.dailyMinutes };
      }
      state.totalStudyMinutes = Math.max(0, Math.floor(Number(p.totalStudyMinutes) || 0));
      state.currentStreak = Math.max(0, Math.floor(Number(p.currentStreak) || 0));
      state.lastActiveDate = p.lastActiveDate || null;
      if (p.lastMockTestScore != null) {
        state.lastMockTestScore = Math.round(Number(p.lastMockTestScore));
      }
      state.lastMockTestDate = p.lastMockTestDate || null;
      state.bestMockTestScore = Math.max(0, Math.round(Number(p.bestMockTestScore) || 0));
    },
  },
});

export const { addStudyMinutes, setMockTestScore, hydrateProgressFromServer } =
  progressSlice.actions;

export default progressSlice.reducer;
