const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

async function generateQuestions({ jobTitle, jobDescription, resumeText, count = 25 }) {
  const prompt = `You are an expert technical interviewer. Generate exactly ${count} interview questions for a ${jobTitle} role.

Job Description:
${jobDescription || "Not provided"}

Candidate Resume:
${resumeText || "Not provided"}

Generate a mix of:
- 10 technical/role-specific questions (assess hard skills)
- 8 behavioral questions (STAR format, past experiences)
- 7 situational questions (hypothetical scenarios)

Return ONLY a valid JSON array with this structure:
[
  {
    "id": "q1",
    "text": "Question text here",
    "category": "technical|behavioral|situational",
    "difficulty": "easy|medium|hard",
    "hint": "What the interviewer is looking for"
  }
]`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 4000,

    reasoning_format: "hidden",
  });

  const raw = completion.choices[0].message.content;
  const jsonMatch = raw.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error("Failed to parse questions JSON from Groq");

  return JSON.parse(jsonMatch[0]);
}

async function evaluateAnswer({ question, answer, jobTitle }) {
  const prompt = `You are an expert interviewer evaluating a candidate for a ${jobTitle} position.

Question: "${question}"
Candidate Answer: "${answer}"

Evaluate this answer on a scale of 0-5 for:
1. Relevance and completeness
2. Technical accuracy (if applicable)
3. Communication clarity
4. Use of specific examples

Return ONLY valid JSON:
{
  "score": <number 0-5 with one decimal>,
  "feedback": "<2-3 sentence specific feedback>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "keywords_present": ["<keyword1>", "<keyword2>"],
  "keywords_missing": ["<keyword1>", "<keyword2>"]
}`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 800,
    reasoning_format: "hidden",
  });

  const raw = completion.choices[0].message.content;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse evaluation JSON from Groq");

  return JSON.parse(jsonMatch[0]);
}

async function analyzeResumeJD({ resumeText, jobDescription, jobTitle }) {
  const prompt = `Analyze the match between this resume and job description for a ${jobTitle} role.

Job Description:
${jobDescription}

Resume:
${resumeText}

Return ONLY valid JSON:
{
  "matchScore": <0-100>,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill1", "skill2"],
  "experienceRelevance": "<assessment>",
  "topStrengths": ["strength1", "strength2", "strength3"],
  "atsKeywords": ["keyword1", "keyword2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
    max_tokens: 1200,
    reasoning_format: "hidden",
  });

  const raw = completion.choices[0].message.content;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse JD analysis JSON from Groq");

  return JSON.parse(jsonMatch[0]);
}

async function generateReport({ jobTitle, questions, overallScore }) {

  const TOTAL_CHAR_BUDGET = 24000;
  const QUESTION_TEXT_LIMIT = 200; 

  const answeredQs = questions.filter(q => q.answer);
  const numQs = answeredQs.length || 1;

  
  const perQBudget  = Math.floor(TOTAL_CHAR_BUDGET / numQs);
  const answerLimit = Math.max(50, perQBudget - QUESTION_TEXT_LIMIT - 22);

  let totalChars = 0;
  const summaryLines = [];
  for (const q of answeredQs) {
    const qText = (q.text   || "").slice(0, QUESTION_TEXT_LIMIT);
    const ans   = (q.answer || "").slice(0, answerLimit);
    const line  = `Q: ${qText}\nA: ${ans}\nScore: ${q.score?.overall || "N/A"}/5`;
    if (totalChars + line.length > TOTAL_CHAR_BUDGET) break; 
    summaryLines.push(line);
    totalChars += line.length;
  }
  const qSummary = summaryLines.join("\n\n");

  const prompt = `Generate a comprehensive interview performance report for a ${jobTitle} candidate.

Overall Score: ${overallScore}/5

Interview Q&A Summary:
${qSummary}

Return ONLY valid JSON:
{
  "summary": "<2-3 sentence overall assessment>",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["area1", "area2", "area3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "nextSteps": "<actionable advice>"
}`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
    
    max_tokens: 1500,
    reasoning_format: "hidden",
  });

  const raw = completion.choices[0].message.content || "";

  
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch (_) 
  }


  console.warn("generateReport: full JSON not found, extracting available fields. finish_reason:",
    completion.choices[0].finish_reason);

  const extract = (key) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`, "i"));
    return m ? m[1] : "";
  };
  const extractArr = (key) => {
    const m = raw.match(new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]+)\\]`, "i"));
    if (!m) return [];
    return m[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, "")) || [];
  };

  return {
    summary: extract("summary") || "Report could not be fully generated. Please retry.",
    strengths: extractArr("strengths"),
    improvements: extractArr("improvements"),
    recommendations: extractArr("recommendations"),
    nextSteps: extract("nextSteps") || "",
  };
}

module.exports = { generateQuestions, evaluateAnswer, analyzeResumeJD, generateReport };
