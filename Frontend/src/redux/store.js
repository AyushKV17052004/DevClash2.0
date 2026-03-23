import { configureStore } from '@reduxjs/toolkit';
import studyReducer from './studySlice';
import questionReducer from './questionSlice';
import knowledgeReducer from './knowledgeGraphSlice';
import practiceIntentReducer from './practiceIntentSlice';
import progressReducer from './progressSlice';
import authReducer from './authSlice';
import { loadPersistedState, persistState } from './persistState';

const preloaded = loadPersistedState();

export const store = configureStore({
  reducer: {
    study: studyReducer,
    knowledge: knowledgeReducer,
    questions: questionReducer,
    practiceIntent: practiceIntentReducer,
    progress: progressReducer,
    auth: authReducer,
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