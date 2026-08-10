# InterviewAI — System Architecture & Design
>InterviewAI is a full-stack MERN web application that acts as an **AI-powered mock interview coach.** Users can upload their resume, paste a job description, and then get interviewed by it — either by speaking or typing. After finishing, they receive a **detailed report with scores and feedback.**
---

## 📐 High-Level Architecture Overview

```mermaid
graph TB
    subgraph CLIENT["🌐 Client Layer — React + Vite (Port 5173)"]
        UI["React SPA"]
        PAGES["Pages\n• SetupPage\n• InterviewPage\n• ReportPage"]
        CTX["Context\n• AuthContext"]
        SVC["Services\n• api.js (Axios)"]
    end

    subgraph BACKEND["⚙️ Backend Layer — Node.js + Express (Port 5000)"]
        SERVER["server.js\n(Entry Point)"]
        MW["Middleware\n• Auth (JWT verify)"]

        subgraph ROUTES["REST API Routes"]
            R_AUTH["/api/auth"]
            R_INT["/api/interview"]
            R_RES["/api/resume"]
            R_SCORE["/api/score"]
        end

        subgraph AI_SVC["AI Services"]
            GROQ["groq.service.js\n(gpt-oss-120b)"]
        end

        subgraph SCORE_SVC["Scoring Services"]
            SCORING["scoring.service.js\n• Cosine Similarity (BoW)\n• Keyword Match\n• Fluency Score\n• ATS Score"]
        end
    end

    subgraph EXTERNAL["☁️ External Services"]
        GROQ_API["Groq Cloud API\ngpt-oss-120b"]
        GOOGLE_AUTH["Google OAuth2\nIdentity Platform"]
        MONGO[("MongoDB Atlas\nCloud Database")]
    end

    UI --> PAGES
    PAGES --> CTX
    PAGES --> SVC
    SVC -->|"HTTP REST + JWT Bearer"| SERVER
    SERVER --> MW
    MW --> ROUTES
    R_INT --> GROQ
    R_INT --> SCORING
    R_RES --> GROQ
    R_RES --> SCORING
    R_SCORE --> GROQ
    GROQ -->|"API Call"| GROQ_API
    R_AUTH <-->|"OAuth2 verify"| GOOGLE_AUTH
    SERVER <-->|"Mongoose ODM"| MONGO

    style CLIENT fill:#1a1a2e,stroke:#7c3aed,color:#e2e8f0
    style BACKEND fill:#0f172a,stroke:#2563eb,color:#e2e8f0
    style EXTERNAL fill:#0c1a0c,stroke:#16a34a,color:#e2e8f0
    style ROUTES fill:#1e2235,stroke:#475569,color:#e2e8f0
    style AI_SVC fill:#1a1230,stroke:#7c3aed,color:#e2e8f0
    style SCORE_SVC fill:#12201a,stroke:#059669,color:#e2e8f0
```

---

## 🔄 Interview Session Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as React Frontend
    participant API as Express Backend
    participant Groq as Groq AI (gpt-oss-120b)
    participant DB as MongoDB

    User->>FE: Upload Resume + Enter Job Details
    FE->>API: POST /api/resume/upload
    API->>API: Extract text (pdf-parse / mammoth)
    API-->>FE: resumeText extracted

    User->>FE: Click "Start Interview"
    FE->>API: POST /api/interview/start
    API->>Groq: generateQuestions(jobTitle, JD, resume)
    Groq-->>API: 25 questions [technical/behavioral/situational]
    API->>API: atsScore(resumeText, JD) — keyword matching
    API->>DB: Session.create({ questions, atsScore, status:'active' })
    DB-->>API: sessionId
    API-->>FE: { sessionId, questions }

    loop For each question (up to 25)
        FE->>User: Display question
        User->>FE: Type answer OR speak (Web Speech API)
        FE->>API: POST /api/interview/:id/answer OR /transcribe
        API->>API: scoreAnswer() — CosSim + Keyword + Fluency
        API->>Groq: evaluateAnswer() — LLM score + feedback
        Groq-->>API: { score, feedback, strengths, improvements }
        API->>DB: Update session.questions[n].score
        API-->>FE: { score } via HTTP response
    end

    User->>FE: End Interview
    FE->>API: POST /api/interview/:id/end
    API->>API: Compute overallScore = avg(all answered Qs)
    API->>DB: Session.update({ status:'completed', overallScore })
    API->>DB: User.update({ avgScore, interviewCount })
    API-->>FE: { overallScore, duration }

    User->>FE: View Report
    FE->>API: POST /api/score/report/:sessionId
    API->>Groq: generateReport(questions, overallScore)
    Groq-->>API: { summary, strengths, improvements, recommendations }
    API->>DB: Report.create({ scores, questionBreakdown })
    API-->>FE: Full Report
    FE->>User: Render Recharts + Breakdown
```

---

## 🏗️ Component Architecture

```mermaid
graph LR
    subgraph FE["Frontend — React 18 + Vite"]
        subgraph AUTH["Auth Layer"]
            AC["AuthContext.jsx\n• user state\n• login/logout\n• token persist"]
            GOAUTH["@react-oauth/google\nGoogle One-Tap"]
        end

        subgraph ROUTER["React Router v6"]
            R1["/ → SetupPage"]
            R2["/interview/:id → InterviewPage"]
            R3["/report/:id → ReportPage"]
            R4["/login → Auth"]
        end

        subgraph PAGES2["Pages"]
            SP["SetupPage.jsx\n• Resume upload\n• JD input\n• ATS preview"]
            IP["InterviewPage.jsx\n• Q&A interface\n• Voice recorder\n• Timer\n• Live score"]
            RP["ReportPage.jsx\n• Recharts radar/bar\n• Category breakdown\n• Download PDF"]
        end

        APIJS["api.js\n• Axios instance\n• JWT interceptor\n• Auto-logout on 401"]
    end

    AC --> PAGES2
    ROUTER --> PAGES2
    PAGES2 --> APIJS
    GOAUTH --> AC
```

---

## 🗄️ Database Schema Design

```mermaid
erDiagram
    USER {
        ObjectId _id PK
        String name
        String email UK
        String password "bcrypt hashed"
        String googleId "optional, sparse"
        String role "default: user"
        Number interviewCount
        Number avgScore
        Date createdAt
        Date updatedAt
    }

    SESSION {
        ObjectId _id PK
        ObjectId userId FK
        String jobTitle
        String jobDescription
        String resumeText
        String status "setup|active|completed|abandoned"
        Array questions
        Date startedAt
        Date completedAt
        Number totalDuration "seconds"
        Number overallScore "0-5"
        Number atsScore "0-100"
    }

    QUESTION_EMBEDDED {
        String id "q1...q25"
        String text
        String category "technical|behavioral|situational"
        String difficulty "easy|medium|hard"
        String answer
        String transcript
        Object score
        Date answeredAt
        Number duration
    }

    SCORE_EMBEDDED {
        Number overall "0-5 weighted"
        Number cosSim "cosine similarity"
        Number keyword "keyword match"
        Number llm "Groq LLM eval"
        Number fluency "word/sentence stats"
        String feedback
        Array strengths
        Array improvements
        Array keywordsMissing
    }

    REPORT {
        ObjectId _id PK
        ObjectId sessionId FK
        ObjectId userId FK
        Object scores "overall, bert, keyword, llm, ats, technical, behavioral, situational, communication"
        Array strengths
        Array improvements
        Array recommendations
        Array questionBreakdown
        Date generatedAt
    }

    USER ||--o{ SESSION : "has many"
    SESSION ||--|{ QUESTION_EMBEDDED : "embeds"
    QUESTION_EMBEDDED ||--|| SCORE_EMBEDDED : "embeds"
    SESSION ||--o| REPORT : "generates one"
    USER ||--o{ REPORT : "owns"
```

---

## 🧠 Scoring Engine Design

```mermaid
graph TD
    ANS["Candidate Answer Text"]
    
    ANS --> B["Cosine Similarity (Bag-of-Words)\n\n• Tokenize Q + A (lowercase, no stopwords)\n• Binary vectors (1 if token present, else 0)\n• dot(A,B) / (|A|×|B|) × 6, max 5\n• Weight: 25%"]
    ANS --> K["Keyword Match Score\n• Union(Q tokens, domain keywords)\n• Intersection with answer\n• matchRate × 5\n• Weight: 20%"]
    ANS --> F["Fluency Score\n• Word count heuristics\n• Sentence count\n• Avg sentence length\n• Score 0.3–0.9 × 5\n• Weight: 10%"]
    ANS --> L["LLM Evaluation (Groq)\n• Relevance + completeness\n• Technical accuracy\n• Communication clarity\n• Use of examples\n• Score 0–5\n• Weight: 45%"]

    B --> W["Weighted Average\n(CosSim×0.25 + Keyword×0.20 + LLM×0.45 + Fluency×0.10)"]
    K --> W
    F --> W
    L --> W

    W --> OS["Overall Score (0–5)"]

    ATS["ATS Score (Resume vs JD)\n• tokenize(JD) → jdSet\n• tokenize(resume) → resumeSet\n• matched = jdSet ∩ resumeSet\n• score = min(100, matchRate × 120)"]

    style ANS fill:#1a1a2e,stroke:#7c3aed,color:#e2e8f0
    style W fill:#1e2235,stroke:#f59e0b,color:#f59e0b
    style OS fill:#0c1a0c,stroke:#16a34a,color:#16a34a
    style ATS fill:#1a1230,stroke:#7c3aed,color:#e2e8f0
```

---

## 🔐 Authentication Flow

```mermaid
graph LR
    subgraph AUTH_METHODS["Auth Methods"]
        EP["Email + Password\nPOST /api/auth/signup\nPOST /api/auth/login"]
        GO["Google OAuth\nPOST /api/auth/google\ngoogle-auth-library"]
    end

    EP -->|"bcrypt.hash(12)"| DB2["MongoDB User"]
    GO -->|"verifyIdToken()"| GAPI["Google Identity API"]
    GAPI --> DB2

    DB2 -->|"jwt.sign(7d)"| JWT["JWT Token\n{ id, name, email }"]
    JWT -->|"localStorage"| LS["Client Storage"]
    LS -->|"Bearer header"| MW2["Auth Middleware\njwt.verify()"]
    MW2 -->|"req.user"| PROT["Protected Routes"]
```

---

## 📦 Technology Stack Summary

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 + Vite | SPA with fast HMR dev server |
| **Routing** | React Router v6 | Client-side navigation |
| **HTTP Client** | Axios | REST API calls + interceptors |
| **Auth** | @react-oauth/google | Google One-Tap login |
| **Charts** | Recharts | Score visualization |
| **Backend** | Node.js + Express 4 | REST API server |
| **Database** | MongoDB + Mongoose | Document store |
| **Auth** | JWT + bcryptjs | Token-based auth + password hashing |
| **Google Auth** | google-auth-library | OAuth2 token verification |
| **AI** | Groq SDK (openai/gpt-oss-120b) | Question gen, answer eval, report gen |
| **Resume Parsing** | pdf-parse + mammoth | Extract text from PDF/DOCX |
| **File Upload** | Multer | Memory-buffered multipart upload |
| **Dev Server** | Nodemon | Auto-reload backend |

---

## 📂 Project Directory Structure

```
ai-mock-interview/
├── frontend/                          # React + Vite SPA
│   ├── src/
│   │   ├── App.jsx                    # Root + router config
│   │   ├── main.jsx                   # React DOM entry
│   │   ├── index.css                  # Global styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx        # Auth state provider
│   │   ├── pages/
│   │   │   ├── SetupPage.jsx          # Step 1: Resume + JD input
│   │   │   ├── InterviewPage.jsx      # Step 2: Q&A session
│   │   │   └── ReportPage.jsx         # Step 3: Results + charts
│   │   ├── services/
│   │   │   └── api.js                 # Axios + all API methods
│   │   └── hooks/                     # Custom React hooks
│   ├── index.html
│   ├── vite.config.js
│   └── vercel.json                    # Vercel deployment config
│
└── backend/                           # Node.js + Express server
    ├── server.js                      # App bootstrap
    ├── index.js                       # Alt entry (dev)
    ├── middleware/
    │   └── auth.js                    # JWT protect middleware
    ├── models/
    │   └── index.js                   # User, Session, Report schemas
    ├── routes/
    │   ├── auth.js                    # /api/auth/*
    │   ├── interview.js               # /api/interview/*
    │   ├── resume.js                  # /api/resume/*
    │   └── score.js                   # /api/score/*
    └── services/
        ├── ai/
        │   ├── groq.service.js        # LLM functions (Groq SDK)
        │   └── whisper.service.js     # (Speech-to-text stub)
        └── scoring/
            ├── scoring.service.js     # Hybrid scoring engine
            └── score.js               # Score utilities
```

---

## 🌐 API Endpoint Map

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | ❌ | Register with email + password |
| `POST` | `/api/auth/login` | ❌ | Login with email + password |
| `POST` | `/api/auth/google` | ❌ | Google OAuth2 login |
| `GET` | `/api/auth/me` | ✅ | Get current user profile |
| `POST` | `/api/resume/upload` | ✅ | Upload PDF/DOCX resume → extract text |
| `POST` | `/api/resume/analyze` | ✅ | AI analysis of resume vs JD |
| `POST` | `/api/interview/start` | ✅ | Generate questions + create session |
| `GET` | `/api/interview/` | ✅ | List all sessions (last 20) |
| `GET` | `/api/interview/:id` | ✅ | Get single session details |
| `POST` | `/api/interview/:id/answer` | ✅ | Submit typed answer + score |
| `POST` | `/api/interview/:id/transcribe` | ✅ | Submit voice transcript + score |
| `POST` | `/api/interview/:id/end` | ✅ | Finalize session + compute score |
| `POST` | `/api/score/report/:id` | ✅ | Generate AI report for session |
| `GET` | `/api/score/report/:id` | ✅ | Fetch existing report |
| `POST` | `/api/score/ats-check` | ✅ | Standalone ATS keyword check |
| `GET` | `/api/score/history` | ✅ | Get user's report history |
| `GET` | `/api/health` | ❌ | Server + DB health check |

---

## 🔑 Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **AI Model** | gpt-oss-120b via Groq | Fast inference, free tier, high quality |
| **Scoring** | Hybrid (CosSim + Keyword + LLM + Fluency) | Uses bag-of-words cosine similarity. Resilience if LLM fails; multi-dimensional. |
| **DB Design** | Questions embedded in Session | Avoids joins; answers are always queried with session |
| **Auth** | JWT (7d) in localStorage | Stateless, simple; trade-off: no server-side revoke |
| **File Upload** | Multer memory storage | No disk I/O; text extracted and discarded immediately |
| **Frontend Build** | Vite | Sub-second HMR, ESM native, fast prod builds |
| **Resume Parsing** | pdf-parse + mammoth | Handles both PDF and DOCX without cloud dependency |
