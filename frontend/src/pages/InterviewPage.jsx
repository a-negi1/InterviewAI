import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { interviewAPI } from "../services/api";
import {
  MicIcon,
  TextIcon,
  CheckIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  AlertCircleIcon,
  CrossIcon,
  VolumeIcon,
  StopIcon,
  RefreshIcon,
} from "../components/Icons";

const MODES = { TEXT: "text", VOICE: "voice" };

function categoryMeta(cat) {
  const map = {
    technical: { label: "Technical", color: "var(--brand)", bg: "var(--brand-light)" },
    behavioral: { label: "Behavioral", color: "#a855f7", bg: "rgba(168, 85, 247, 0.12)" },
    situational: { label: "Situational", color: "var(--green)", bg: "var(--green-bg)" },
  };
  return map[cat] || { label: cat, color: "var(--text-2)", bg: "var(--surface-3)" };
}

function difficultyMeta(d) {
  const map = {
    easy: { color: "var(--green-text)", bg: "var(--green-bg)", border: "var(--green-border)" },
    medium: { color: "var(--amber-text)", bg: "var(--amber-bg)", border: "var(--amber-border)" },
    hard: { color: "var(--red-text)", bg: "var(--red-bg)", border: "var(--red-border)" },
  };
  return map[d] || map.medium;
}

function ScoreBar({ score }) {
  const pct = (score / 5) * 100;
  const color = score >= 4 ? "var(--green)" : score >= 3 ? "var(--amber)" : "var(--red)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, color: "var(--text-2)", fontWeight: 500 }}>Answer score</span>
        <span className="tabular-nums" style={{ fontSize: 22, fontWeight: 800, color }}>
          {score.toFixed(1)}
          <span style={{ fontSize: 14, color: "var(--text-3)", fontWeight: 400, marginLeft: 2 }}>/ 5.0</span>
        </span>
      </div>
      <div className="progress" style={{ height: 8 }}>
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </div>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="page" style={{ paddingTop: 48 }}>
      <div className="skeleton" style={{ height: 28, width: 200, marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 6, marginBottom: 28 }} />
      <div className="skeleton" style={{ height: 200, borderRadius: 16, marginBottom: 20 }} />
      <div className="skeleton" style={{ height: 52, borderRadius: 12, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 180, borderRadius: 16 }} />
    </div>
  );
}

export default function InterviewPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mode, setMode] = useState(MODES.VOICE);
  const [textAnswer, setTextAnswer] = useState("");
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState(null);


  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [recordDuration, setRecordDuration] = useState(0);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const [speechSupported] = useState(
    () => "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  );

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const transcriptBoxRef = useRef(null);


  useEffect(() => {
    interviewAPI.getSession(sessionId)
      .then(res => { setSession(res.data); setLoading(false); })
      .catch(() => { setError("Session not found"); setLoading(false); });
  }, [sessionId]);


  useEffect(() => () => {
    recognitionRef.current?.stop();
    clearInterval(timerRef.current);
    window.speechSynthesis?.cancel();
  }, []);


  useEffect(() => {
    if (transcriptBoxRef.current) {
      transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight;
    }
  }, [finalTranscript, liveTranscript]);

  const currentQ = session?.questions[currentIdx];
  const isLast = session && currentIdx === session.questions.length - 1;
  const answeredCount = Object.keys(scores).length;
  const scored = scores[currentQ?.id];
  const hasTranscript = finalTranscript.trim().length > 10;


  const playQuestion = useCallback(() => {
    if (!currentQ || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(currentQ.text);
    utt.rate = 0.88;
    utt.pitch = 1.0;
    utt.onstart = () => setTtsPlaying(true);
    utt.onend = () => setTtsPlaying(false);
    utt.onerror = () => setTtsPlaying(false);
    window.speechSynthesis.speak(utt);
  }, [currentQ]);

  const stopTTS = () => { window.speechSynthesis?.cancel(); setTtsPlaying(false); };


  const startRecording = useCallback(() => {
    if (!speechSupported) return setError("Voice not supported in this browser. Use Chrome or Edge, or switch to text mode.");
    setError(null);
    setFinalTranscript("");
    setLiveTranscript("");

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let accumulated = "";

    recognition.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) accumulated += t + " ";
        else interim = t;
      }
      setFinalTranscript(accumulated);
      setLiveTranscript(interim);
    };

    recognition.onerror = (e) => {
      if (e.error !== "aborted") setError(`Mic error: ${e.error}. Try switching to text mode.`);
      stopRecording();
    };

    recognition.onend = () => { setIsRecording(false); clearInterval(timerRef.current); };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);

    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setRecordDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, [speechSupported]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    clearInterval(timerRef.current);
  }, []);

  const resetRecording = () => {
    setFinalTranscript("");
    setLiveTranscript("");
    setRecordDuration(0);
    setError(null);
  };


  const submitVoice = useCallback(async () => {
    const transcript = finalTranscript.trim();
    if (!transcript || !currentQ) return;
    setSubmitting(true);
    try {
      const res = await interviewAPI.transcribeVoice(sessionId, {
        questionId: currentQ.id,
        transcript,
        duration: recordDuration,
      });
      setScores(prev => ({ ...prev, [currentQ.id]: res.data.score }));
      resetRecording();
    } catch {
      setError("Failed to submit answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [finalTranscript, currentQ, sessionId, recordDuration]);


  const submitText = async () => {
    if (!textAnswer.trim() || !currentQ) return;
    setSubmitting(true);
    try {
      const res = await interviewAPI.submitAnswer(sessionId, {
        questionId: currentQ.id,
        answer: textAnswer,
        duration: 0,
      });
      setScores(prev => ({ ...prev, [currentQ.id]: res.data.score }));
      setTextAnswer("");
    } catch {
      setError("Failed to submit answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };


  const endInterview = async () => {
    setEnding(true);
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop();
    try {
      await interviewAPI.endSession(sessionId);
      navigate(`/report/${sessionId}`);
    } catch {
      setError("Could not end session. Please try again.");
      setEnding(false);
    }
  };


  const goTo = (idx) => {
    setCurrentIdx(idx);
    resetRecording();
    setTextAnswer("");
    setError(null);
    stopTTS();
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  if (loading) return <SkeletonLoader />;
  if (error && !session) return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "60vh", gap: 16
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "var(--amber-bg)", border: "1px solid var(--amber-border)",
        display: "flex", alignItems: "center", justifyContent: "center"
      }}>
        <AlertCircleIcon size={28} color="var(--amber)" />
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 16 }}>{error}</p>
      <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
        Back to dashboard
      </button>
    </div>
  );
  if (!session) return null;

  const catMeta = categoryMeta(currentQ?.category);
  const difMeta = difficultyMeta(currentQ?.difficulty);
  const progress = ((currentIdx + 1) / session.questions.length) * 100;

  return (
    <div className="page fade-up" style={{ maxWidth: 860 }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12
      }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 3 }}>{session.jobTitle}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: "var(--text-2)" }}>
            <span className="tabular-nums">Q{currentIdx + 1} of {session.questions.length}</span>
            <span style={{ color: "var(--border-strong)" }}>·</span>
            <span className="tabular-nums">{answeredCount} answered</span>
            {answeredCount > 0 && (
              <>
                <span style={{ color: "var(--border-strong)" }}>·</span>
                <span className="tabular-nums" style={{ color: "var(--green)", fontWeight: 600 }}>
                  avg {(Object.values(scores).reduce((s, sc) => s + Number(sc.overall), 0) / answeredCount).toFixed(1)} / 5.0
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={endInterview}
          disabled={ending}
          className="btn btn-danger btn-sm"
        >
          {ending ? "Ending…" : "End & get report"}
        </button>
      </div>

      <div className="progress" style={{ marginBottom: 28 }}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      {error && (
        <div className="alert alert-danger fade-in" style={{ marginBottom: 20 }}>
          <AlertCircleIcon size={16} style={{ flexShrink: 0, marginTop: 2 }} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            aria-label="Dismiss error"
            style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 2, display: "flex", alignItems: "center" }}
          >
            <CrossIcon size={14} />
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 20, padding: "clamp(18px, 4vw, 28px)" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            padding: "4px 12px", borderRadius: 999,
            fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase",
            background: catMeta.bg, color: catMeta.color,
          }}>
            {catMeta.label}
          </span>
          <span style={{
            padding: "3px 10px", borderRadius: 999,
            fontSize: 11, fontWeight: 600, letterSpacing: "0.3px", textTransform: "uppercase",
            background: difMeta.bg, color: difMeta.color, border: `1px solid ${difMeta.border}`,
          }}>
            {currentQ?.difficulty}
          </span>
          {scored && (
            <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5 }} className="badge badge-green tabular-nums">
              <CheckIcon size={12} />
              <span>Answered · {scored.overall.toFixed(1)} / 5.0</span>
            </span>
          )}
        </div>

        <p style={{
          fontSize: "clamp(16px, 4vw, 19px)", fontWeight: 600, lineHeight: 1.6,
          color: "var(--text-1)", marginBottom: 22
        }}>
          {currentQ?.text}
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={ttsPlaying ? stopTTS : playQuestion}
            className="btn btn-ghost btn-sm"
            style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            {ttsPlaying ? (
              <>
                <StopIcon size={14} />
                <span>Stop</span>
              </>
            ) : (
              <>
                <VolumeIcon size={14} />
                <span>Listen</span>
              </>
            )}
          </button>
          {!speechSupported && (
            <span style={{ fontSize: 12, color: "var(--amber)", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <AlertCircleIcon size={14} />
              <span>Voice not supported in this browser — use text mode</span>
            </span>
          )}
        </div>
      </div>

      <div className="mode-toggle" style={{ marginBottom: 20 }}>
        <button
          className={`mode-btn ${mode === MODES.VOICE ? "active" : ""}`}
          onClick={() => { setMode(MODES.VOICE); resetRecording(); }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        >
          <MicIcon size={15} />
          <span>Voice mode</span>
        </button>
        <button
          className={`mode-btn ${mode === MODES.TEXT ? "active" : ""}`}
          onClick={() => { setMode(MODES.TEXT); stopRecording(); }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}
        >
          <TextIcon size={15} />
          <span>Text mode</span>
        </button>
      </div>

      {mode === MODES.VOICE && (
        <div className="card fade-in" style={{
          marginBottom: 20, padding: "clamp(20px, 4vw, 32px)",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
        }}>
          {!isRecording && !hasTranscript && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{
                width: 80, height: 80, borderRadius: "50%",
                background: "var(--brand-light)", border: "2px solid var(--brand-glow)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 20px",
              }}>
                <MicIcon size={34} color="var(--brand)" />
              </div>
              <p style={{ color: "var(--text-2)", fontSize: 15, marginBottom: 20 }}>
                {speechSupported
                  ? "Click to start recording your answer"
                  : "Voice not available — switch to text mode"}
              </p>
              <button
                onClick={startRecording}
                disabled={!speechSupported}
                className="btn btn-primary btn-lg"
                style={{ minWidth: 180 }}
              >
                Start recording
              </button>

            </div>
          )}

          { }
          {isRecording && (
            <div className="fade-in">
              { }
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 14, marginBottom: 24
              }}>
                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{
                    position: "absolute",
                    width: 48, height: 48, borderRadius: "50%",
                    border: "2px solid var(--red)", opacity: 0.4,
                    animation: "pulse-ring 1.5s ease-out infinite",
                  }} />
                  <div style={{
                    position: "absolute",
                    width: 48, height: 48, borderRadius: "50%",
                    border: "2px solid var(--red)", opacity: 0.2,
                    animation: "pulse-ring 1.5s ease-out 0.5s infinite",
                  }} />
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: "var(--red)", zIndex: 1,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, color: "white"
                  }}>●</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-1)" }}>
                    Recording
                  </div>
                  <div style={{ fontSize: 13, color: "var(--red)", fontWeight: 600 }}>
                    {formatDuration(recordDuration)}
                  </div>
                </div>
                { }
                <div className="waveform">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>

              { }
              {(finalTranscript || liveTranscript) && (
                <div
                  ref={transcriptBoxRef}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border-strong)",
                    borderRadius: 12,
                    padding: "16px 20px",
                    fontSize: 15, lineHeight: 1.7,
                    minHeight: 100, maxHeight: 200, overflowY: "auto",
                    marginBottom: 20,
                    color: "var(--text-1)",
                  }}
                >
                  <span>{finalTranscript}</span>
                  <span style={{ color: "var(--text-3)", fontStyle: "italic" }}>{liveTranscript}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={stopRecording}
                  className="btn btn-danger"
                  style={{ minWidth: 160, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  <StopIcon size={15} color="white" />
                  <span>Stop recording</span>
                </button>
              </div>
            </div>
          )}

          {!isRecording && hasTranscript && (
            <div className="fade-in">
              <div style={{
                display: "flex", alignItems: "center", gap: 8, marginBottom: 12
              }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.5px", color: "var(--text-3)"
                }}>
                  Your transcript
                </span>
                <div className="divider" style={{ flex: 1 }} />
                <span className="tabular-nums" style={{ fontSize: 12, color: "var(--text-3)" }}>
                  {formatDuration(recordDuration)}
                </span>
              </div>

              <div
                ref={transcriptBoxRef}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 12,
                  padding: "18px 20px",
                  fontSize: 15, lineHeight: 1.7,
                  maxHeight: 220, overflowY: "auto",
                  marginBottom: 20,
                  color: "var(--text-1)",
                }}
              >
                {finalTranscript}
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={submitVoice}
                  disabled={submitting}
                  className="btn btn-success"
                  style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                >
                  {submitting ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{
                        width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "white", borderRadius: "50%",
                        animation: "spin 0.7s linear infinite", display: "inline-block"
                      }} />
                      Scoring…
                    </span>
                  ) : (
                    <>
                      <CheckCircleIcon size={16} />
                      <span>Submit answer</span>
                    </>
                  )}
                </button>
                <button
                  onClick={resetRecording}
                  className="btn btn-secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  <RefreshIcon size={15} />
                  <span>Re-record</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === MODES.TEXT && (
        <div className="fade-in" style={{ marginBottom: 20 }}>
          <textarea
            value={textAnswer}
            onChange={e => setTextAnswer(e.target.value)}
            placeholder="Type your answer here in as much detail as possible…"
            rows={9}
            style={{ marginBottom: 12, fontSize: 15, lineHeight: 1.7 }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span className="tabular-nums" style={{ fontSize: 12, color: "var(--text-3)" }}>
              {textAnswer.trim().split(/\s+/).filter(Boolean).length} words
            </span>
            <span style={{ fontSize: 12, color: "var(--text-3)" }}>
              Aim for 100+ words for a complete answer
            </span>
          </div>
          <button
            onClick={submitText}
            disabled={submitting || !textAnswer.trim()}
            className="btn btn-success btn-lg"
            style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          >
            {submitting ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{
                  width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)",
                  borderTopColor: "white", borderRadius: "50%",
                  animation: "spin 0.7s linear infinite", display: "inline-block"
                }} />
                Scoring answer…
              </span>
            ) : (
              <>
                <CheckCircleIcon size={16} />
                <span>Submit answer</span>
              </>
            )}
          </button>
        </div>
      )}

      {scored && (
        <div
          className="card fade-in"
          style={{
            marginBottom: 20, padding: "clamp(16px, 3.5vw, 24px) clamp(16px, 4vw, 28px)",
            background: "var(--green-bg)",
            border: "1px solid var(--green-border)",
          }}
        >
          <ScoreBar score={scored.overall} />

          <p style={{
            fontSize: 14, lineHeight: 1.7,
            color: "var(--green-text)", margin: "14px 0 16px",
            fontWeight: 500
          }}>
            {scored.feedback}
          </p>

          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(75px, 1fr))",
            gap: 8,
          }}>
            {[
              { label: "BERT", val: scored.bert },
              { label: "Keyword", val: scored.keyword },
              { label: "LLM", val: scored.llm },
            ].map(({ label, val }) => (
              <div key={label} style={{
                background: "var(--glass-bg-strong)",
                border: "1px solid var(--glass-border-soft)",
                backdropFilter: "var(--blur-light)",
                borderRadius: 10, padding: "10px 12px",
                textAlign: "center",
              }}>
                <div className="tabular-nums" style={{ fontSize: 18, fontWeight: 800, color: "var(--green)", marginBottom: 2 }}>
                  {val?.toFixed(1) ?? "—"}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "var(--green-text)", opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {scored.improvements?.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--green-border)" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "var(--green-text)", marginBottom: 6, opacity: 0.85 }}>
                TO IMPROVE:
              </p>
              <ul style={{ paddingLeft: 18, margin: 0 }}>
                {scored.improvements.slice(0, 2).map((imp, i) => (
                  <li key={i} style={{ fontSize: 13, color: "var(--green-text)", lineHeight: 1.6 }}>{imp}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="interview-nav">
        <div className="question-dots-track" aria-label="Question selector">
          {session.questions.map((q, i) => {
            const hasScore = !!scores[q.id];
            const isCurrent = i === currentIdx;
            return (
              <button
                key={i}
                onClick={() => goTo(i)}
                title={`Question ${i + 1}`}
                aria-label={`Question ${i + 1}${hasScore ? " (answered)" : ""}`}
                style={{
                  width: isCurrent ? 24 : 10,
                  height: 10,
                  borderRadius: 5,
                  background: isCurrent ? "var(--brand)"
                    : hasScore ? "var(--green)"
                      : "var(--border-strong)",
                  border: "none", cursor: "pointer",
                  transition: "all 0.2s ease",
                  padding: 0,
                }}
              />
            );
          })}
        </div>

        <div className="interview-nav-actions">
          <button
            onClick={() => goTo(currentIdx - 1)}
            disabled={currentIdx === 0}
            className="btn btn-secondary"
            style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          >
            <ArrowLeftIcon size={15} />
            <span>Previous</span>
          </button>

          {!isLast ? (
            <button
              onClick={() => goTo(currentIdx + 1)}
              className="btn btn-primary"
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <span>Next</span>
              <ArrowRightIcon size={15} />
            </button>
          ) : (
            <button
              onClick={endInterview}
              disabled={ending}
              className="btn btn-success"
              style={{ flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              {ending ? "Finishing…" : (
                <>
                  <CheckCircleIcon size={16} />
                  <span>Finish interview</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
