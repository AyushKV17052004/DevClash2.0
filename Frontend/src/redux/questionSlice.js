import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeQuestions: [],
  currentTopic: null,    // Tracks what topic the AI is currently analyzing
  isGenerating: false,
  error: null,           // Catch API or generation errors
};

export const questionSlice = createSlice({
  name: 'questions',
  initialState,
  reducers: {
    startGenerating: (state, action) => {
      state.isGenerating = true;
      state.error = null;
      state.currentTopic = action.payload; // Pass the topic string here
    },
    setQuestions: (state, action) => {
      // action.payload should be an array of { id, q, type, difficulty }
      state.activeQuestions = action.payload;
      state.isGenerating = false;
    },
    generationFailed: (state, action) => {
      state.isGenerating = false;
      state.error = action.payload; // Store the error message
    },
    clearQuestions: (state) => {
      state.activeQuestions = [];
      state.currentTopic = null;
    }
  },
});

export const { 
  setQuestions, 
  startGenerating, 
  generationFailed, 
  clearQuestions 
} = questionSlice.actions;

export default questionSlice.reducer;