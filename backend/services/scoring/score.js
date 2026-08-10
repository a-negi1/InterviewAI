const router = require("express").Router();
const { protect } = require("../middleware/auth");
const { Session, Report } = require("../models");
const { generateReport } = require("../services/ai/groq.service");
const { atsScore } = require("../services/scoring/scoring.service");


router.post("/report/:sessionId", protect, async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.sessionId, userId: req.user._id });
    if (!session) return res.status(404).json({ message: "Session not found" });
    if (session.status !== "completed") return res.status(400).json({ message: "Session not completed yet" });

    
    const existing = await Report.findOne({ sessionId: session._id });
    if (existing) return res.json(existing);

    const answeredQs = session.questions.filter((q) => q.score?.overall != null);
    const llmReport = await generateReport({
      jobTitle: session.jobTitle,
      questions: answeredQs,
      overallScore: session.overallScore,
    });

    
    const scores = {
      overall: session.overallScore,
      bert: avg(answeredQs, "bert"),
      keyword: avg(answeredQs, "keyword"),
      llm: avg(answeredQs, "llm"),
      ats: session.atsScore || 0,
      technical: avgByCategory(answeredQs, "technical"),
      behavioral: avgByCategory(answeredQs, "behavioral"),
      situational: avgByCategory(answeredQs, "situational"),
    };

    const report = await Report.create({
      sessionId: session._id,
      userId: req.user._id,
      scores,
      strengths: llmReport.strengths || [],
      improvements: llmReport.improvements || [],
      recommendations: llmReport.recommendations || [],
      questionBreakdown: answeredQs.map((q) => ({
        questionId: q.id,
        text: q.text,
        score: q.score.overall,
        feedback: q.score.feedback,
      })),
    });

    res.json(report);
  } catch (err) {
    
    if (err.status === 413 || err.message?.includes("rate_limit_exceeded")) {
      return res.status(429).json({
        message: "Report generation temporarily unavailable: the interview transcript exceeded the free-tier token limit. Please try again in a minute, or upgrade your Groq plan at console.groq.com/settings/billing."
      });
    }
    console.error("[/report/:sessionId] 500 error:", err.message);
    res.status(500).json({ message: err.message });
  }
});


router.get("/report/:sessionId", protect, async (req, res) => {
  try {
    const report = await Report.findOne({ sessionId: req.params.sessionId, userId: req.user._id });
    if (!report) return res.status(404).json({ message: "Report not found. Generate it first." });
    res.json(report);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.post("/ats-check", protect, async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ message: "resumeText and jobDescription required" });
    }
    const result = atsScore(resumeText, jobDescription);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.get("/history", protect, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user._id })
      .populate("sessionId", "jobTitle createdAt")
      .sort({ createdAt: -1 })
      .limit(10);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


function avg(questions, field) {
  const vals = questions.map((q) => q.score?.[field]).filter((v) => v != null);
  if (!vals.length) return 0;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

function avgByCategory(questions, category) {
  const filtered = questions.filter((q) => q.category === category);
  return avg(filtered, "overall");
}

module.exports = router;
