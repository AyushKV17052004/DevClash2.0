import { configureStore } from '@reduxjs/toolkit';
import studyReducer from './studySlice';
import questionReducer from './questionSlice';
import knowledgeReducer from './knowledgeGraphSlice';
import practiceIntentReducer from './practiceIntentSlice';
import progressReducer from './progressSlice';
import authReducer, { loadAuth } from './authSlice';
import persistedReducer from './persistedSlice';
import { loadPersistedState, persistState } from './persistState';

const localPreloaded = loadPersistedState() || {};
const preloaded = {
  ...localPreloaded,
  auth: loadAuth() || undefined,
};

export const store = configureStore({
  reducer: {
    study: studyReducer,
    knowledge: knowledgeReducer,
    questions: questionReducer,
    practiceIntent: practiceIntentReducer,
    progress: progressReducer,
    auth: authReducer,
    persisted: persistedReducer,
  },
  preloadedState: preloaded,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

store.subscribe(() => {
  persistState(store.getState());
});