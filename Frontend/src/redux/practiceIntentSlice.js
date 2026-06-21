import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  /** { examTrack, topicInput, autoGenerate } — set when navigating from Subjects */
  intent: null,
};

export const practiceIntentSlice = createSlice({
  name: "practiceIntent",
  initialState,
  reducers: {
    setPracticeIntent: (state, action) => {
      state.intent = action.payload;
    },
    clearPracticeIntent: (state) => {
      state.intent = null;
    },
  },
});

export const { setPracticeIntent, clearPracticeIntent } =
  practiceIntentSlice.actions;

export default practiceIntentSlice.reducer;
