import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Calendar, Target, Award, Network, Trophy } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { retentionAtDay } from "../../lib/forgettingCurve";
import { selectMergedWeakTopics } from "../../redux/knowledgeGraphSlice";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const RETENTION_COLORS = [
  "#a855f7", "#22d3ee", "#f97316", "#10b981", "#ec4899", "#6366f1",
  "#14b8a6", "#f59e0b", "#8b5cf6", "#06b6d4", "#84cc16", "#ef4444",
];

function formatTotalMinutes(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function Progress() {
  const concepts = useSelector((state) => state.knowledge?.concepts || {});
  const mergedWeak = useSelector(selectMergedWeakTopics);
  const progress = useSelector((state) => state.progress) || {};
  const adaptiveStats = useSelector((state) => state.study?.adaptiveStats) || {};

  const {
    dailyMinutes = {},
    totalStudyMinutes = 0,
    currentStreak = 0,
    lastMockTestScore = null,
    lastMockTestDate = null,
    bestMockTestScore = 0,
  } = progress;

  const weakConceptLabels = useMemo(() => {
    const weakSet = new Set(mergedWeak.map((t) => String(t).trim().toLowerCase()));
    return Object.values(concepts)
      .filter((c) => weakSet.has((c.label || "").trim().toLowerCase()) || (c.strength || 100) < 55)
      .sort((a, b) => (a.strength || 0) - (b.strength || 0));
  }, [concepts, mergedWeak]);

  const forgettingCurveData = useMemo(() => {
    const list = weakConceptLabels;
    if (list.length === 0) return { rows: [], labels: [] };
    const maxDay = 14;
    const rows = [];
    for (let d = 0; d <= maxDay; d += 1) {
      const row = { day: d === 0 ? "Now" : `+${d}d` };
      list.forEach((c, i) => {
        const stability = Math.max(
          0.5,
          (c.intervalDays || 1) * ((c.easeFactor || 2.5) / 2.5)
        );
        row[`t${i}`] = retentionAtDay(stability, d);
      });
      rows.push(row);
    }
    return { rows, labels: list.map((c) => c.label) };
  }, [weakConceptLabels]);

  const weeklyData = useMemo(() => {
    const today = new Date();
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const mins = dailyMinutes[key] || 0;
      out.push({
        day: DAY_LABELS[d.getDay()],
        hours: Math.round(mins * 10) / 60,
        fullDay: key,
      });
    }
    return out;
  }, [dailyMinutes]);

  const avgScore =
    (adaptiveStats.correctTotal || 0) + (adaptiveStats.incorrectTotal || 0) > 0
      ? Math.round(
          (100 * (adaptiveStats.correctTotal || 0)) /
            ((adaptiveStats.correctTotal || 0) + (adaptiveStats.incorrectTotal || 0))
        )
      : null;

  const achievements = useMemo(
    () => [
      {
        title: "Week Streak",
        value: `${currentStreak} day${currentStreak !== 1 ? "s" : ""}`,
        icon: Award,
        color: "from-yellow-500 to-orange-500",
      },
      {
        title: "Total Study Time",
        value: formatTotalMinutes(totalStudyMinutes) || "0h",
        icon: Calendar,
        color: "from-blue-500 to-cyan-500",
      },
      {
        title: "Average Score",
        value: avgScore != null ? `${avgScore}%` : "—",
        icon: Target,
        color: "from-purple-500 to-pink-500",
      },
    ],
    [currentStreak, totalStudyMinutes, avgScore]
  );

  return (
    <div className="p-8 space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-white mb-2">Progress Analytics</h1>
        <p className="text-gray-400">
          Track your learning journey. Data from knowledge graph, weak topics, and study time.
        </p>
      </div>

      {/* Mock test scores (from Subjects → Mock Test) */}
      <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-white">Mock test (100 marks)</h2>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          Last score and best score from full mock tests (+4 / −1). Synced to your profile.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <p className="text-xs text-gray-500">Last score</p>
            <p className="text-2xl font-bold text-white mt-1">
              {lastMockTestScore != null ? `${lastMockTestScore} / 100` : "—"}
            </p>
            {lastMockTestDate && (
              <p className="text-[10px] text-gray-500 mt-1">{lastMockTestDate}</p>
            )}
          </div>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-4">
            <p className="text-xs text-amber-200/80">Best score</p>
            <p className="text-2xl font-bold text-amber-200 mt-1">
              {bestMockTestScore > 0 ? `${bestMockTestScore} / 100` : "—"}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center">
            <p className="text-sm text-gray-400">
              Start a mock from <span className="text-purple-300">Subjects</span> → Create Mock Test.
            </p>
          </div>
        </div>
      </div>

      {/* Knowledge graph — forgetting curves */}
      <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <Network className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Knowledge graph · forgetting curves</h2>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Ebbinghaus-style retention (from SM-2) for all weak topics. Weak topics from Study
          Planner, Adaptive Practice & Mock Test feed this — synced on every refresh.
        </p>
        {forgettingCurveData.rows?.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forgettingCurveData.rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} stroke="#9ca3af" style={{ fontSize: 11 }} label={{ value: "Retention %", angle: -90, position: "insideLeft", fill: "#9ca3af" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a2e",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Legend />
                {forgettingCurveData.labels.map((label, i) => (
                  <Line
                    key={label}
                    type="monotone"
                    dataKey={`t${i}`}
                    name={label}
                    stroke={RETENTION_COLORS[i % RETENTION_COLORS.length]}
                    dot={false}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-8 text-center">
            Generate a study plan with weak chapters or miss questions in Adaptive Practice — then
            review cards in Spaced Repetition to build your graph.
          </p>
        )}
        {mergedWeak.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 w-full">Active weak topics (from DB):</span>
            {mergedWeak.slice(0, 12).map((t) => (
              <span key={t} className="text-xs px-2 py-1 rounded-md bg-orange-500/15 text-orange-200 border border-orange-500/20">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {achievements.map((achievement, idx) => {
          const Icon = achievement.icon;
          return (
            <div key={idx} className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${achievement.color} opacity-20 flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-sm text-gray-400">{achievement.title}</p>
              </div>
              <p className="text-2xl font-semibold text-white">{achievement.value}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-[#1a1a2e] rounded-xl border border-white/10 p-6 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-blue-400" />
          <h2 className="text-lg font-semibold text-white">Weekly Study Hours</h2>
        </div>
        <p className="text-xs text-gray-500 mb-2">Based on time spent on site (stored in DB)</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: "12px" }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1a1a2e",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="hours" fill="url(#barGradientProgress)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="barGradientProgress" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
