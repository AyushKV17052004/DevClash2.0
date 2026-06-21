import { useMemo } from "react";
import { useSelector } from "react-redux";
import { Calendar, Target, Award, Trophy, PieChart as PieIcon } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { selectMergedWeakTopics } from "../../redux/knowledgeGraphSlice";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Hard, editorial chart colors — no neon
const RETENTION_COLORS = [
  "#C0392B", "#E67E22", "#2471A3", "#1E8449", "#7D3C98",
  "#1B2540", "#D35400", "#117A65", "#6C3483", "#B7950B",
  "#1A5276", "#922B21",
];

function formatTotalMinutes(min) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const CARD_STYLE = {
  border: "2px solid var(--border-hard)",
  borderRadius: "4px",
  background: "var(--card)",
  padding: "1.5rem",
};

const SECTION_HEADING = {
  fontFamily: "'Merriweather', Georgia, serif",
  fontWeight: "700",
};

const renderCustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="p-3 text-xs"
        style={{
          background: "var(--card)",
          border: "2px solid var(--border-hard)",
          borderRadius: "4px",
          color: "var(--foreground)",
          boxShadow: "3px 3px 0 var(--border-hard)",
        }}
      >
        <p className="font-bold mb-1">{payload[0].name}</p>
        <p className="font-medium text-[#C0392B]">
          Attention Required: <span className="font-black">{payload[0].value}%</span>
        </p>
      </div>
    );
  }
  return null;
};

export function Progress() {
  const concepts = useSelector((state) => state.knowledge?.concepts || {});
  const mergedWeak = useSelector(selectMergedWeakTopics);
  const plannerWeak = useSelector((state) => state.knowledge?.plannerWeakTopics || []);
  const spacedWeak = useSelector((state) => state.knowledge?.spacedWeakTopics || []);
  const practiceWeak = useSelector((state) => state.knowledge?.practiceWeakTopics || []);
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

  // Calculate raw attention score & proportion of attention needed
  const pieChartData = useMemo(() => {
    if (mergedWeak.length === 0) return [];
    
    const rawData = mergedWeak.map((topic) => {
      const topicLower = topic.trim().toLowerCase();
      let score = 10; // Base score
      
      if (plannerWeak.map(w => w.toLowerCase()).includes(topicLower)) score += 15;
      if (spacedWeak.map(w => w.toLowerCase()).includes(topicLower)) score += 10;
      if (practiceWeak.map(w => w.toLowerCase()).includes(topicLower)) score += 10;
      
      // Look up concept in SM-2 concepts
      const concept = Object.values(concepts).find(
        (c) => (c.label || "").trim().toLowerCase() === topicLower
      );
      if (concept) {
        const strength = concept.strength ?? 100;
        if (strength < 100) {
          score += (100 - strength) * 0.3; // Lower strength = higher weight
        }
      }
      
      return {
        name: topic,
        value: score,
      };
    });

    const totalScore = rawData.reduce((acc, curr) => acc + curr.value, 0);

    return rawData
      .map((d) => ({
        name: d.name,
        value: Math.round((d.value / totalScore) * 1000) / 10,
      }))
      .sort((a, b) => b.value - a.value);
  }, [mergedWeak, plannerWeak, spacedWeak, practiceWeak, concepts]);

  // Consolidate beyond top 5 into "Other Topics" for chart readability
  const processedPieData = useMemo(() => {
    if (pieChartData.length <= 6) return pieChartData;
    const top = pieChartData.slice(0, 5);
    const rest = pieChartData.slice(5);
    const restSum = rest.reduce((acc, curr) => acc + curr.value, 0);
    return [
      ...top,
      {
        name: "Other Topics",
        value: Math.round(restSum * 10) / 10,
      },
    ];
  }, [pieChartData]);

  const weeklyData = useMemo(() => {
    const today = new Date();
    const out = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const mins = dailyMinutes[key] || 0;
      out.push({ day: DAY_LABELS[d.getDay()], hours: Math.round(mins * 10) / 60, fullDay: key });
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
        color: "#E67E22",
        emoji: "🔥",
      },
      {
        title: "Total Study Time",
        value: formatTotalMinutes(totalStudyMinutes) || "0h",
        icon: Calendar,
        color: "#2471A3",
        emoji: "⏱️",
      },
      {
        title: "Average Score",
        value: avgScore != null ? `${avgScore}%` : "—",
        icon: Target,
        color: "#1E8449",
        emoji: "🎯",
      },
    ],
    [currentStreak, totalStudyMinutes, avgScore]
  );

  const tooltipStyle = {
    backgroundColor: "var(--card)",
    border: "2px solid var(--border-hard)",
    borderRadius: "4px",
    color: "var(--foreground)",
    fontSize: "12px",
  };

  return (
    <div className="p-8 space-y-6 relative">
      {/* Stickers */}
      <div
        className="sticker sticker-slow"
        style={{ top: "4%", right: "2%", fontSize: "2.5rem", "--sticker-rot": "-10deg" }}
      >📊</div>
      <div
        className="sticker sticker-drift"
        style={{ top: "30%", right: "3%", fontSize: "2rem", "--sticker-rot": "8deg", animationDelay: "1s" }}
      >🏆</div>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 rounded-full" style={{ background: "#C0392B" }} />
          <h1
            className="text-3xl font-black text-foreground"
            style={SECTION_HEADING}
          >
            Progress Analytics
          </h1>
        </div>
        <p className="text-muted-foreground ml-4 text-sm">
          Track your learning journey. Data from knowledge graph, weak topics, and study time.
        </p>
      </div>

      {/* Mock test scores */}
      <div style={CARD_STYLE}>
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="w-5 h-5" style={{ color: "#E67E22" }} />
          <h2 className="text-base font-bold text-foreground" style={SECTION_HEADING}>
            Mock Test (100 marks)
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Last score and best score from full mock tests (+4 / −1). Synced to your profile.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div
            style={{
              border: "2px solid var(--border-hard)",
              borderRadius: "4px",
              padding: "1rem",
              background: "var(--muted)",
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Last score</p>
            <p className="text-2xl font-black text-foreground mt-1">
              {lastMockTestScore != null ? `${lastMockTestScore} / 100` : "—"}
            </p>
            {lastMockTestDate && (
              <p className="text-[10px] text-muted-foreground mt-1">{lastMockTestDate}</p>
            )}
          </div>
          <div
            style={{
              border: `2px solid #E67E22`,
              borderRadius: "4px",
              padding: "1rem",
              background: "#E67E22/10",
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#E67E22" }}>
              Best score 🏆
            </p>
            <p className="text-2xl font-black text-foreground mt-1">
              {bestMockTestScore > 0 ? `${bestMockTestScore} / 100` : "—"}
            </p>
          </div>
          <div
            style={{
              border: "2px solid var(--border)",
              borderRadius: "4px",
              padding: "1rem",
              background: "var(--muted)",
            }}
            className="flex items-center"
          >
            <p className="text-sm text-muted-foreground">
              Start a mock from{" "}
              <span className="font-bold" style={{ color: "#C0392B" }}>
                Subjects
              </span>{" "}
              → Create Mock Test.
            </p>
          </div>
        </div>
      </div>

      {/* Weak Topics Attention Weights Pie Chart */}
      <div style={CARD_STYLE}>
        <div className="flex items-center gap-2 mb-2">
          <PieIcon className="w-5 h-5" style={{ color: "#2471A3" }} />
          <h2 className="text-base font-bold text-foreground" style={SECTION_HEADING}>
            Weak Topics Attention Weight
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Proportional attention required based on topic difficulty, concept strength, and weekly reviews.
        </p>
        {processedPieData.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 min-h-[300px]">
            <div className="w-full md:w-1/2 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={renderCustomTooltip} />
                  <Pie
                    data={processedPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {processedPieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={RETENTION_COLORS[index % RETENTION_COLORS.length]}
                        stroke="var(--card)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* List breakdown with custom color bars */}
            <div className="w-full md:w-1/2 space-y-3">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Attention Required (%)
              </p>
              {processedPieData.map((d, index) => (
                <div key={d.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-foreground">
                    <span className="truncate max-w-[70%]">{d.name}</span>
                    <span>{d.value}%</span>
                  </div>
                  <div className="w-full bg-var(--border) rounded-full h-2 overflow-hidden" style={{ border: "1px solid var(--border-hard)" }}>
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${d.value}%`,
                        backgroundColor: RETENTION_COLORS[index % RETENTION_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Excellent! You have no weak topics on your list. Make a weekly plan or take adaptive tests to track items.
          </p>
        )}
      </div>

      {/* Achievement stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {achievements.map((achievement, idx) => {
          const Icon = achievement.icon;
          return (
            <div key={idx} style={CARD_STYLE}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 flex items-center justify-center shrink-0"
                  style={{ background: achievement.color, borderRadius: "4px" }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {achievement.title}
                </p>
              </div>
              <p className="text-3xl font-black text-foreground" style={SECTION_HEADING}>
                {achievement.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Weekly bar chart */}
      <div style={CARD_STYLE}>
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5" style={{ color: "#2471A3" }} />
          <h2 className="text-base font-bold text-foreground" style={SECTION_HEADING}>
            Weekly Study Hours
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-2">Based on time spent on site (stored in DB)</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
              <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="hours" fill="#C0392B" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
