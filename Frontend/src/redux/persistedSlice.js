import { createSlice } from "@reduxjs/toolkit";

const defaultHistory = [
  {
    role: "assistant",
    content: "Hi — I'm glad you're here. Ask me anything you're stuck on, or attach a photo of a problem and I'll walk you through it in simple, plain language.",
  }
];

const initialState = {
  tutorChatHistory: defaultHistory,
  studyPlan: "",
  studyPlanChapters: [{ id: "1", name: "", status: "Not Started" }],
  studyPlanExamType: "JEE Main",
  studyPlanExamDate: "",
};

export const persistedSlice = createSlice({
  name: "persisted",
  initialState,
  reducers: {
    setTutorChatHistory: (state, action) => {
      return {
        ...state,
        tutorChatHistory: Array.isArray(action.payload) ? action.payload : [],
      };
    },
    appendTutorMessage: (state, action) => {
      const currentHistory = Array.isArray(state.tutorChatHistory) ? state.tutorChatHistory : [];
      return {
        ...state,
        tutorChatHistory: [...currentHistory, action.payload],
      };
    },
    clearTutorChatHistory: (state) => {
      return {
        ...state,
        tutorChatHistory: defaultHistory,
      };
    },
    setStudyPlannerState: (state, action) => {
      const { studyPlan, studyPlanChapters, studyPlanExamType, studyPlanExamDate } = action.payload;
      return {
        ...state,
        studyPlan: studyPlan !== undefined ? studyPlan : state.studyPlan,
        studyPlanChapters: studyPlanChapters !== undefined ? (Array.isArray(studyPlanChapters) ? studyPlanChapters : []) : state.studyPlanChapters,
        studyPlanExamType: studyPlanExamType !== undefined ? studyPlanExamType : state.studyPlanExamType,
        studyPlanExamDate: studyPlanExamDate !== undefined ? studyPlanExamDate : state.studyPlanExamDate,
      };
    },
    hydratePersistedState: (state, action) => {
      const p = action.payload;
      if (!p || typeof p !== "object") return state;
      return {
        ...state,
        tutorChatHistory: Array.isArray(p.tutorChatHistory) ? (p.tutorChatHistory.length > 0 ? p.tutorChatHistory : defaultHistory) : state.tutorChatHistory,
        studyPlan: p.studyPlan !== undefined ? p.studyPlan : state.studyPlan,
        studyPlanChapters: Array.isArray(p.studyPlanChapters) ? (p.studyPlanChapters.length > 0 ? p.studyPlanChapters : [{ id: "1", name: "", status: "Not Started" }]) : state.studyPlanChapters,
        studyPlanExamType: p.studyPlanExamType !== undefined ? p.studyPlanExamType : state.studyPlanExamType,
        studyPlanExamDate: p.studyPlanExamDate !== undefined ? p.studyPlanExamDate : state.studyPlanExamDate,
      };
    },
  },
});

export const {
  setTutorChatHistory,
  appendTutorMessage,
  clearTutorChatHistory,
  setStudyPlannerState,
  hydratePersistedState,
} = persistedSlice.actions;

export default persistedSlice.reducer;
