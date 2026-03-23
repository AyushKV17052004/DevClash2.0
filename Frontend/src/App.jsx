import "./App.css";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { store } from "./redux/store";
import { hydrateKnowledgeFromServer } from "./redux/knowledgeGraphSlice";
import { hydrateStudyFromServer } from "./redux/studySlice";
import { hydrateProgressFromServer, addStudyMinutes } from "./redux/progressSlice";
import { fetchUserProfile, saveUserProfile } from "./api/userApi";
import { Navbar } from "./app/components/Navbar";
import { DailyQuoteOverlay } from "./app/components/DailyQuoteOverlay";
import { Sidebar } from "./app/components/Sidebar";
import { Dashboard } from "./app/components/Dashboard";
import { StudyPlanner } from "./app/components/StudyPlanner";
import { SpacedRepetition } from "./app/components/SpacedRepetition";
import { AITutor } from "./app/components/AITutor";
import { AdaptivePractice } from "./app/components/AdaptivePractice";
import { VideoSummarizer } from "./app/components/VideoSummarizer";
import { Subjects } from "./app/components/Subjects";
import { Progress } from "./app/components/Progress";
import { Settings } from "./app/components/Settings";
import { Auth } from "./app/components/Auth";
import { logout } from "./redux/authSlice";

const THEME_KEY = "learnai-theme";

function readStoredTheme() {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export default function App() {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const [theme, setTheme] = useState(readStoredTheme);
  const [activeFeature, setActiveFeature] = useState("dashboard");
  const [sidebarView, setSidebarView] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await fetchUserProfile();
      if (cancelled) return;
      if (p) {
        dispatch(
          hydrateKnowledgeFromServer({
            plannerWeakTopics: p.plannerWeakTopics,
            spacedWeakTopics: p.spacedWeakTopics,
            practiceWeakTopics: p.practiceWeakTopics,
            concepts: p.concepts,
          })
        );
        dispatch(
          hydrateStudyFromServer({
            flashcards: p.flashcards,
            adaptiveStats: p.adaptiveStats,
          })
        );
        if (p.progressStats) {
          dispatch(hydrateProgressFromServer(p.progressStats));
        }
      }
      setDbReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!dbReady) return;
    let timeoutId;
    const scheduleSave = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const s = store.getState();
        saveUserProfile({
          plannerWeakTopics: s.knowledge.plannerWeakTopics,
          spacedWeakTopics: s.knowledge.spacedWeakTopics,
          practiceWeakTopics: s.knowledge.practiceWeakTopics,
          concepts: s.knowledge.concepts,
          adaptiveStats: s.study.adaptiveStats,
          flashcards: s.study.flashcards,
          progressStats: s.progress,
        }).catch(() => {});
      }, 2000);
    };
    const unsub = store.subscribe(scheduleSave);
    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, [dbReady]);

  useEffect(() => {
    if (!dbReady) return;
    let intervalId;
    const tick = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        store.dispatch(addStudyMinutes(1));
      }
    };
    intervalId = setInterval(tick, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [dbReady]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleFeatureSelect = (feature = "dashboard") => {
    setActiveFeature(feature);
  };

  const handleSidebarViewChange = (view = "dashboard") => {
    setSidebarView(view);
    setActiveFeature("dashboard"); // reset navbar feature
  };

  // Mapping instead of switch (cleaner)
  const featureComponents = {
    planner: <StudyPlanner />,
    repetition: <SpacedRepetition />,
    tutor: <AITutor />,
    practice: <AdaptivePractice />,
    summarizer: <VideoSummarizer />,
  };

  const sidebarComponents = {
    dashboard: <Dashboard onNavigateToFeature={handleFeatureSelect} />,
    subjects: <Subjects onNavigateToFeature={handleFeatureSelect} />,
    progress: <Progress />,
    // theme + setter required — Settings toggles global day/dark mode
    settings: <Settings theme={theme} onThemeChange={setTheme} onLogout={handleLogout} />,
  };

  const renderContent = () => {
    if (activeFeature !== "dashboard") {
      return featureComponents[activeFeature] || <Dashboard />;
    }
    return sidebarComponents[sidebarView] || <Dashboard />;
  };

  const mainBg = theme === "light" ? "bg-slate-100" : "bg-[#0a0a12]";
  const rootBg = theme === "light" ? "bg-slate-100" : "bg-[#0a0a12]";

  if (!auth?.token) {
    return <Auth />;
  }

  return (
    <div className={`h-screen flex flex-col ${rootBg}`}>
      <DailyQuoteOverlay />
      <Navbar
        activeFeature={activeFeature}
        onFeatureSelect={handleFeatureSelect}
        theme={theme}
        user={auth?.user}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden min-h-0">
        <Sidebar
          activeView={sidebarView}
          onViewChange={handleSidebarViewChange}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed((prev) => !prev)}
          theme={theme}
        />

        <main className={`flex-1 overflow-y-auto min-h-0 ${mainBg}`}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
}