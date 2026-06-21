import { configureStore } from '@reduxjs/toolkit';
import studyReducer from './studySlice.js';
import questionReducer from './questionSlice.js';
import knowledgeReducer from './knowledgeGraphSlice.js';
import practiceIntentReducer from './practiceIntentSlice.js';
import progressReducer from './progressSlice.js';
import authReducer from './authSlice.js';
import { loadPersistedState } from './persistState.js';

// Mock localStorage
global.localStorage = {
  getItem: (key) => {
    if (key === "learnai-auth") {
      return JSON.stringify({ token: "test-token-123", user: { id: "user-123", username: "testuser" } });
    }
    if (key === "devclash-learning-state-v1") {
      return JSON.stringify({ study: { count: 1 }, knowledge: { graph: {} } });
    }
    return null;
  },
  setItem: () => {},
  removeItem: () => {}
};

const preloaded = loadPersistedState();
console.log("Preloaded state from localStorage:", preloaded);

const store = configureStore({
  reducer: {
    study: studyReducer,
    knowledge: knowledgeReducer,
    questions: questionReducer,
    practiceIntent: practiceIntentReducer,
    progress: progressReducer,
    auth: authReducer,
  },
  preloadedState: preloaded,
});

console.log("Store state after configureStore:", store.getState());
