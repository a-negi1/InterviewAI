import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider, ThemeToggle, useTheme } from "./context/ThemeContext";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import SetupPage from "./pages/SetupPage";
import InterviewPage from "./pages/InterviewPage";
import ReportPage from "./pages/ReportPage";
import { interviewAPI } from "./services/api";
import {
  MicIcon,
  CheckCircleIcon,
  ChartBarIcon,
  AlertCircleIcon,
  PlusIcon,
  SignOutIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "./components/Icons";

function MeshBackground() {
  return (
    <div className="mesh-bg" aria-hidden="true">
      <div className="mesh-blob-3" />
    </div>
  );
}

function Watermark() {
  const year = new Date().getFullYear();
  return (
    <div className="watermark">
      <span className="watermark-copy">&copy; {year}</span>
      <span className="watermark-name">Adheesh Negi</span>
      <span className="watermark-dot" aria-hidden="true" />
      <span className="watermark-rights">All Rights Reserved</span>
    </div>
  );
}

function LoginPage() {
  const { login, register, googleLogin } = useAuth();
  const { theme } = useTheme();
  const [mode, setMode] = React.useState("login");
  const [form, setForm] = React.useState({ name: "", email: "", password: "" });
  const [error, setError] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Google authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError("Google Sign-In failed. Please try again.");
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div className="card card-glass-strong auth-card fade-up">
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              width: 52, height: 52, background: "var(--brand)", borderRadius: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 24, margin: "0 auto 14px", boxShadow: "0 8px 24px var(--brand-glow)",
              overflow: "hidden"
            }}>
              <img src="/ai-icon.png" alt="InterviewAI" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p style={{ fontSize: 14, color: "var(--text-2)" }}>
              {mode === "login"
                ? "Sign in to continue your practice"
                : "Start practising interviews with AI"}
            </p>
          </div>

          {error && (
            <div className="alert alert-danger fade-in" style={{ marginBottom: 20 }}>
              <AlertCircleIcon size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && (
              <div className="field">
                <label>Full name</label>
                <input
                  placeholder="Alex Johnson"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  autoComplete="name"
                  autoFocus={mode === "register"}
                />
              </div>
            )}
            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                autoFocus={mode === "login"}
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ marginTop: 8, width: "100%" }}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{
                    width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "white", borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                    display: "inline-block"
                  }} />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span>{mode === "login" ? "Sign in" : "Create account"}</span>
                  <ArrowRightIcon size={16} />
                </span>
              )}
            </button>
          </form>

          <div className="divider-text" style={{ margin: "24px 0" }}>or</div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme={theme === "dark" ? "filled_black" : "outline"}
              shape="pill"
              size="large"
              text={mode === "login" ? "signin_with" : "signup_with"}
            />
          </div>

          <p style={{ textAlign: "center", fontSize: 14, color: "var(--text-2)" }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              style={{
                background: "none", border: "none", color: "var(--brand)",
                fontWeight: 700, cursor: "pointer", fontSize: 14, fontFamily: "inherit"
              }}
            >
              {mode === "login" ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "100vh", gap: 16, color: "var(--text-2)"
    }}>
      <div style={{
        width: 36, height: 36, border: "3px solid var(--border)",
        borderTopColor: "var(--brand)", borderRadius: "50%",
        animation: "spin 0.7s linear infinite"
      }} />
      <span style={{ fontSize: 14 }}>Loading…</span>
    </div>
  );
  return user ? children : <Navigate to="/login" />;
}

function SessionCard({ session, onView }) {
  const score = session.overallScore;
  const scoreColor = !score ? "var(--text-3)"
    : score >= 4 ? "var(--green)"
      : score >= 3 ? "var(--amber)"
        : "var(--red)";

  const isCompleted = session.status === "completed";

  return (
    <div
      className={`card session-card ${isCompleted ? "card-hover" : ""}`}
      onClick={isCompleted ? onView : undefined}
      role={isCompleted ? "button" : undefined}
      tabIndex={isCompleted ? 0 : undefined}
      onKeyDown={isCompleted ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onView(); } } : undefined}
      style={{ cursor: isCompleted ? "pointer" : "default" }}
    >
      <div className="session-card-main">
        <div style={{
          flexShrink: 0, width: 50, height: 50, borderRadius: "50%",
          border: `2px solid ${scoreColor}`,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "var(--surface-2)",
        }}>
          {score ? (
            <>
              <span className="tabular-nums" style={{ fontSize: 15, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                {score.toFixed(1)}
              </span>
              <span style={{ fontSize: 9, color: "var(--text-3)", fontWeight: 600 }}>/5</span>
            </>
          ) : <span style={{ fontSize: 18, color: "var(--text-3)" }}>—</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4, color: "var(--text-1)", wordBreak: "break-word" }}>
            {session.jobTitle}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)", display: "flex", flexWrap: "wrap", alignItems: "center" }}>
            <span>
              {new Date(session.createdAt).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric"
              })}
            </span>
            <span style={{ margin: "0 6px", color: "var(--border-strong)" }}>·</span>
            <span>{session.questions?.length || 0} questions</span>
            {session.totalDuration && (
              <>
                <span style={{ margin: "0 6px", color: "var(--border-strong)" }}>·</span>
                <span className="tabular-nums">{Math.floor(session.totalDuration / 60)}m</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="session-card-actions">
        <span className={`badge ${isCompleted ? "badge-green" : "badge-amber"}`}>
          {isCompleted ? "Completed" : "Incomplete"}
        </span>
        {isCompleted && (
          <button
            onClick={(e) => { e.stopPropagation(); onView(); }}
            className="btn btn-secondary btn-sm"
          >
            View report
          </button>
        )}
      </div>
    </div>
  );
}

function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    interviewAPI.listSessions()
      .then(r => setSessions(r.data))
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  const completed = sessions.filter(s => s.status === "completed");
  const avgScore = completed.length
    ? (completed.reduce((sum, s) => sum + (s.overallScore || 0), 0) / completed.length).toFixed(1)
    : null;

  return (
    <div className="page fade-up">
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", marginBottom: 36, flexWrap: "wrap", gap: 16
      }}>
        <div>
          <h1 style={{ fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 800, marginBottom: 6 }}>
            Welcome back, {user?.name?.split(" ")[0] || "there"}
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: 15 }}>
            Ready for your next practice session?
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button onClick={logout} className="btn btn-ghost btn-sm" aria-label="Sign out">
            <SignOutIcon size={15} />
            Sign out
          </button>
          <button onClick={() => navigate("/setup")} className="btn btn-primary">
            <PlusIcon size={15} />
            New interview
          </button>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: 14, marginBottom: 36
      }}>
        {[
          {
            label: "Interviews practiced",
            value: sessions.length,
            Icon: MicIcon,
            color: "var(--brand)",
            bg: "var(--brand-light)"
          },
          {
            label: "Completed sessions",
            value: completed.length,
            Icon: CheckCircleIcon,
            color: "var(--green)",
            bg: "var(--green-bg)"
          },
          {
            label: "Average score",
            value: avgScore ? `${avgScore} / 5.0` : "—",
            Icon: ChartBarIcon,
            color: "var(--amber)",
            bg: "var(--amber-bg)"
          },
        ].map((stat) => (
          <div key={stat.label} className="card card-hover" style={{ padding: "clamp(16px, 3.5vw, 22px) clamp(14px, 4vw, 24px)" }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: stat.bg,
              border: `1px solid ${stat.color}33`,
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 14,
              boxShadow: `0 4px 12px ${stat.color}22`,
            }}>
              <stat.Icon size={20} color={stat.color} />
            </div>
            <div className="tabular-nums" style={{ fontSize: 26, fontWeight: 800, color: stat.color, marginBottom: 4, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500, marginTop: 6 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 16
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Past interviews</h2>
        <span className="tabular-nums" style={{ fontSize: 13, color: "var(--text-3)", fontWeight: 500 }}>
          {sessions.length} total
        </span>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 84, borderRadius: 16 }} />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="card" style={{
          textAlign: "center", padding: "clamp(36px, 8vw, 64px) clamp(16px, 4vw, 24px)",
          background: "var(--surface-2)", border: "1px dashed var(--border-strong)"
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20,
            background: "var(--brand-light)",
            border: "1px solid var(--glass-border)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px"
          }}>
            <SparklesIcon size={28} color="var(--brand)" />
          </div>
          <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8 }}>
            No interview sessions yet
          </h3>
          <p style={{ color: "var(--text-2)", marginBottom: 24, fontSize: 15, maxWidth: 420, margin: "0 auto 24px" }}>
            Start your first AI mock interview to receive role-tailored questions, real-time evaluation, and granular feedback.
          </p>
          <button onClick={() => navigate("/setup")} className="btn btn-primary btn-lg">
            <PlusIcon size={18} />
            Start first interview
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sessions.map((s) => (
            <SessionCard
              key={s._id}
              session={s}
              onView={() => navigate(`/report/${s._id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || "placeholder.apps.googleusercontent.com"}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <div style={{ minHeight: "100vh", position: "relative" }}>
              <MeshBackground />
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
                <Route path="/interview/:sessionId" element={<ProtectedRoute><InterviewPage /></ProtectedRoute>} />
                <Route path="/report/:sessionId" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
              <ThemeToggle />
              <Watermark />
            </div>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}
