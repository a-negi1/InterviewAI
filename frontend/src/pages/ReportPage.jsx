import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { scoreAPI, interviewAPI } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import {
  CheckCircleIcon,
  QuestionMarkIcon,
  ClockIcon,
  TargetIcon,
  SparklesIcon,
  TrendingUpIcon,
  LightbulbIcon,
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "../components/Icons";

function ScoreRing({ score, size = 130 }) {
  const pct = score / 5;
  const color = score >= 4 ? "var(--green)" : score >= 3 ? "var(--amber)" : "var(--red)";
  const r = 48;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;

  return (
    <div
      style={{ position: "relative", width: size, height: size }}
      role="meter"
      aria-label={`Overall score: ${score.toFixed(1)} out of 5.0`}
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={5}
    >
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span className="tabular-nums" style={{ fontSize: 30, fontWeight: 900, color, lineHeight: 1 }}>
          {score.toFixed(1)}
        </span>
        <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 600 }}>/ 5.0</span>
      </div>
    </div>
  );
}

function StatChip({ label, value, Icon, color = "var(--brand)" }) {
  return (
    <div style={{
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      borderRadius: 12, padding: "14px 18px",
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: "var(--surface)", border: "1px solid var(--glass-border-soft)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <Icon size={18} color={color} />
      </div>
      <span className="tabular-nums" style={{ fontSize: 24, fontWeight: 800, color: "var(--text-1)", lineHeight: 1.1 }}>
        {value}
      </span>
      <span style={{ fontSize: 12, color: "var(--text-2)", fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border-strong)",
      borderRadius: 10, padding: "10px 14px", fontSize: 13,
      boxShadow: "var(--shadow-md)"
    }}>
      <p style={{ fontWeight: 700, color: "var(--text-1)", marginBottom: 4 }}>{label}</p>
      <p style={{ color: "var(--brand)", fontWeight: 600 }}>
        Score: {payload[0]?.value?.toFixed(1)}/5
      </p>
    </div>
  );
}

function SkeletonReport() {
  return (
    <div className="page fade-up" style={{ maxWidth: 960 }}>
      {[180, 280, 200, 260].map((h, i) => (
        <div key={i} className="skeleton" style={{ height: h, borderRadius: 16, marginBottom: 20 }} />
      ))}
    </div>
  );
}

export default function ReportPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();

  const [report, setReport] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [expandedQ, setExpandedQ] = useState(null);

  useEffect(() => {
    Promise.all([
      interviewAPI.getSession(sessionId),
      scoreAPI.getReport(sessionId).catch(() => null),
    ]).then(([sessRes, repRes]) => {
      setSession(sessRes.data);
      if (repRes) setReport(repRes.data);
      setLoading(false);
    }).catch(() => {
      setError("Failed to load report data.");
      setLoading(false);
    });
  }, [sessionId]);

  const generateReport = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await scoreAPI.generateReport(sessionId);
      setReport(res.data);
    } catch {
      setError("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <SkeletonReport />;

  if (error && !session) return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "60vh", gap: 16
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "var(--amber-bg)", border: "1px solid var(--amber-border)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <AlertCircleIcon size={28} color="var(--amber)" />
      </div>
      <p style={{ color: "var(--red-text)", fontSize: 16 }}>{error}</p>
      <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
        Back to dashboard
      </button>
    </div>
  );

  const overallScore = session?.overallScore || 0;
  const scoreColor = overallScore >= 4 ? "var(--green)"
    : overallScore >= 3 ? "var(--amber)"
    : "var(--red)";

  const textColor = theme === "dark" ? "rgba(215, 220, 255, 0.65)" : "rgba(30, 35, 80, 0.70)";
  const gridColor = theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(100, 90, 200, 0.12)";

  const radarData = report
    ? [
        { subject: "Technical",     value: (report.scores.technical     / 5) * 100 },
        { subject: "Behavioral",    value: (report.scores.behavioral    / 5) * 100 },
        { subject: "Situational",   value: (report.scores.situational   / 5) * 100 },
        { subject: "Communication", value: (report.scores.communication / 5) * 100 },
      ]
    : [];

  const ats = report?.scores?.ats ?? 0;

  const questionData = report?.questionBreakdown?.map((q, i) => ({
    name: `Q${i + 1}`,
    score: q.score,
    text: q.text,
    feedback: q.feedback,
  })) || [];

  const scoreLabel = overallScore >= 4
    ? "Excellent performance"
    : overallScore >= 3
    ? "Good performance"
    : "Needs improvement";

  const scoreSubtitle = overallScore >= 4
    ? "You demonstrated strong competency — great work!"
    : overallScore >= 3
    ? "Solid foundation. A few areas to refine before the real thing."
    : "Review the feedback below to build your confidence.";

  return (
    <div className="page fade-up" style={{ maxWidth: 960 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 32, flexWrap: "wrap", gap: 16
      }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 900, marginBottom: 6 }}>
            {session?.jobTitle}
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-2)" }}>
            {new Date(session?.completedAt || session?.createdAt).toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric"
            })}
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard")}
          className="btn btn-secondary btn-sm"
          style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeftIcon size={14} />
          <span>Dashboard</span>
        </button>
      </div>

      <div className="card" style={{ marginBottom: 24, padding: "clamp(20px, 4vw, 36px)" }}>
        <div style={{ display: "flex", gap: "clamp(20px, 4vw, 36px)", alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
          <ScoreRing score={overallScore} />

          <div style={{ flex: 1, minWidth: "min(100%, 260px)" }}>
            <div style={{
              display: "inline-block",
              fontSize: 12, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: "0.5px", color: scoreColor,
              background: overallScore >= 4 ? "var(--green-bg)" : overallScore >= 3 ? "var(--amber-bg)" : "var(--red-bg)",
              padding: "4px 12px", borderRadius: 999, marginBottom: 10
            }}>
              {scoreLabel}
            </div>
            <h2 style={{ fontSize: "clamp(18px, 4vw, 22px)", fontWeight: 800, marginBottom: 8 }}>
              Overall Performance
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-2)", lineHeight: 1.65, marginBottom: 24 }}>
              {scoreSubtitle}
            </p>

            <div className="report-stat-grid">
              <StatChip
                Icon={QuestionMarkIcon}
                label="Questions"
                value={session?.questions?.length || 0}
                color="var(--brand)"
              />
              <StatChip
                Icon={CheckCircleIcon}
                label="Answered"
                value={session?.questions?.filter(q => q.answer).length || 0}
                color="var(--green)"
              />
              <StatChip
                Icon={ClockIcon}
                label="Duration"
                value={`${Math.floor((session?.totalDuration || 0) / 60)}m`}
                color="var(--brand)"
              />
              {ats > 0 && (
                <StatChip
                  Icon={TargetIcon}
                  label="Keyword Match"
                  value={`${ats}%`}
                  color="var(--amber)"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {!report ? (
        <div className="card" style={{
          textAlign: "center", padding: "56px 32px",
          background: "var(--brand-light)",
          border: "1px dashed var(--brand)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: "var(--glass-bg-strong)",
            border: "1px solid var(--glass-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px"
          }}>
            <SparklesIcon size={30} color="var(--brand)" />
          </div>
          <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 10 }}>
            AI analysis ready
          </h3>
          <p style={{ color: "var(--text-2)", fontSize: 15, lineHeight: 1.65, maxWidth: 480, margin: "0 auto 28px" }}>
            Generate your detailed performance report with granular scoring, per-question breakdown, and targeted improvement recommendations.
          </p>
          {error && (
            <div className="alert alert-danger fade-in" style={{ maxWidth: 480, margin: "0 auto 20px" }}>
              <AlertCircleIcon size={16} />
              <span>{error}</span>
            </div>
          )}
          <button
            onClick={generateReport}
            disabled={generating}
            className="btn btn-primary btn-lg"
            style={{ minWidth: 220, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {generating ? (
              <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{
                  width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white", borderRadius: "50%",
                  animation: "spin 0.7s linear infinite", display: "inline-block"
                }} />
                Analysing performance…
              </span>
            ) : (
              <>
                <span>Generate full report</span>
                <ArrowRightIcon size={16} />
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="fade-in">
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
            gap: 20, marginBottom: 20
          }}>
            <div className="card" style={{ padding: "clamp(16px, 3.5vw, 24px)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Score breakdown</h3>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={radarData} outerRadius="60%" margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke={gridColor} />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: "clamp(10px, 2.5vw, 12px)", fill: textColor, fontWeight: 500 }}
                  />
                  <Radar
                    name="Score"
                    dataKey="value"
                    stroke="var(--brand)"
                    fill="var(--brand)"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="card" style={{ padding: "clamp(16px, 3.5vw, 24px)" }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Per-question performance</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={questionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: textColor }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: textColor }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--brand-glow)" }} />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
                    {questionData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={
                          entry.score >= 4 ? "#059669"
                            : entry.score >= 3 ? "#d97706"
                            : "#dc2626"
                        }
                        fillOpacity={0.88}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            gap: 20, marginBottom: 20
          }}>
            <div className="card" style={{
              border: "1px solid var(--green-border)",
              padding: "clamp(18px, 3.5vw, 24px) clamp(16px, 4vw, 28px)"
            }}>
              <h3 style={{
                fontSize: 16, fontWeight: 700, marginBottom: 20,
                display: "flex", alignItems: "center", gap: 8,
                color: "var(--green-text)"
              }}>
                <CheckCircleIcon size={18} color="var(--green)" />
                <span>Key strengths</span>
              </h3>
              <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {report.strengths?.map((s, i) => (
                  <li key={i} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    fontSize: 14, lineHeight: 1.65, color: "var(--text-1)"
                  }}>
                    <ChevronRightIcon size={14} color="var(--green)" style={{ flexShrink: 0, marginTop: 4 }} />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card" style={{
              border: "1px solid var(--amber-border)",
              padding: "clamp(18px, 3.5vw, 24px) clamp(16px, 4vw, 28px)"
            }}>
              <h3 style={{
                fontSize: 16, fontWeight: 700, marginBottom: 20,
                display: "flex", alignItems: "center", gap: 8,
                color: "var(--amber-text)"
              }}>
                <TrendingUpIcon size={18} color="var(--amber)" />
                <span>Areas to improve</span>
              </h3>
              <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 12 }}>
                {report.improvements?.map((s, i) => (
                  <li key={i} style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    fontSize: 14, lineHeight: 1.65, color: "var(--text-1)"
                  }}>
                    <ChevronRightIcon size={14} color="var(--amber)" style={{ flexShrink: 0, marginTop: 4 }} />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card" style={{ padding: "clamp(18px, 3.5vw, 28px) clamp(16px, 4vw, 32px)", marginBottom: 20 }}>
            <h3 style={{
              fontSize: 17, fontWeight: 700, marginBottom: 20,
              display: "flex", alignItems: "center", gap: 10
            }}>
              <LightbulbIcon size={18} color="var(--brand)" />
              <span>Actionable recommendations</span>
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {report.recommendations?.map((r, i) => (
                <div key={i} style={{
                  display: "flex", gap: 14, alignItems: "flex-start",
                  padding: "14px 16px",
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                }}>
                  <div className="tabular-nums" style={{
                    flexShrink: 0, width: 26, height: 26,
                    background: "var(--brand-light)",
                    borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800, color: "var(--brand)",
                  }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.65, color: "var(--text-1)", margin: 0 }}>
                    {r}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: "clamp(18px, 3.5vw, 28px) clamp(16px, 4vw, 32px)" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 24 }}>
              Question-by-question feedback
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {report.questionBreakdown?.map((q, i) => {
                const isOpen = expandedQ === i;
                const qScore = q.score;
                const qColor = qScore >= 4 ? "var(--green)"
                  : qScore >= 3 ? "var(--amber)"
                  : "var(--red)";
                const qBg = qScore >= 4 ? "var(--green-bg)"
                  : qScore >= 3 ? "var(--amber-bg)"
                  : "var(--red-bg)";
                const qBorder = qScore >= 4 ? "var(--green-border)"
                  : qScore >= 3 ? "var(--amber-border)"
                  : "var(--red-border)";

                return (
                  <div
                    key={i}
                    style={{
                      borderBottom: i < report.questionBreakdown.length - 1
                        ? "1px solid var(--border)" : "none",
                      padding: "18px 0",
                    }}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={isOpen}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedQ(isOpen ? null : i);
                        }
                      }}
                      className="report-q-row"
                      onClick={() => setExpandedQ(isOpen ? null : i)}
                    >
                      <div className="tabular-nums" style={{
                        flexShrink: 0, width: 32, height: 32, borderRadius: 8,
                        background: "var(--brand)", color: "white",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, fontWeight: 800, marginTop: 2
                      }}>
                        Q{i + 1}
                      </div>

                      <p style={{
                        flex: 1, minWidth: 200, fontSize: 15, fontWeight: 600,
                        lineHeight: 1.5, color: "var(--text-1)", margin: 0
                      }}>
                        {q.text}
                      </p>

                      <div className="report-q-score-box">
                        <span className="tabular-nums" style={{
                          fontSize: 15, fontWeight: 800,
                          background: qBg, color: qColor,
                          border: `1px solid ${qBorder}`,
                          padding: "4px 12px", borderRadius: 999,
                        }}>
                          {q.score?.toFixed(1)} / 5.0
                        </span>
                        <ChevronDownIcon
                          size={16}
                          color="var(--text-3)"
                          style={{
                            transition: "transform 0.2s ease",
                            transform: isOpen ? "rotate(180deg)" : "rotate(0)"
                          }}
                        />
                      </div>
                    </div>

                    {isOpen && (
                      <div className="fade-in" style={{ paddingLeft: "clamp(0px, 3.5vw, 48px)", marginTop: 14 }}>
                        <p style={{
                          fontSize: 14, lineHeight: 1.75, color: "var(--text-1)",
                          background: "var(--surface-2)",
                          border: "1px solid var(--border)",
                          padding: "14px 18px",
                          borderRadius: 12,
                          margin: 0
                        }}>
                          {q.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{
            display: "flex", gap: 14, marginTop: 24, justifyContent: "center", flexWrap: "wrap"
          }}>
            <button
              onClick={() => navigate("/setup")}
              className="btn btn-primary btn-lg"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <span>Practice again</span>
              <ArrowRightIcon size={16} />
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="btn btn-secondary btn-lg"
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              <ArrowLeftIcon size={16} />
              <span>Back to dashboard</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
