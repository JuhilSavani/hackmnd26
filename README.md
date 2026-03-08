# Paperpal: Agentic Manuscript Formatter

**Hackathon:** HackaMined 2026  
**Track Sponsor:** Cactus Communications (Paperpal)  
**Track Name:** Fix My Format, Agent Paperpal (Paperpilot)  

## Overview
Academic publishing requires strict adherence to journal-specific formatting styles. Each of the 46,700 active peer-reviewed journals in the world has its own unique guidelines covering citation styles, heading hierarchy, abstract structure, figure placement, and more. A significant portion of desk rejections happen purely due to formatting.

**Agent Paperpal (Paperpilot)** is an agentic manuscript formatting system that autonomously reformats research manuscripts to comply with a target journal's requirements. It accepts documents (DOCX, PDF, TXT) and returns a validated, submission-ready file.

**Key principle: Agentic rule interpreter, not a template applier.**

---

## The Scale of the Problem

| Metric | Value |
|---|---|
| Manuscripts desk rejected before peer review | 30–70% |
| Hours spent reformatting a single manuscript | 30+ hrs |
| Average journals submitted to before acceptance | 3 |
| Annual cost of manual reformatting globally | $1B+ |
| Papers published every year | 4M+ |

---

## System Architecture

Our application uses a LangGraph-orchestrated AI agent pipeline.

### Input Paths
1. **PDF/TXT Path:** Uploaded file is parsed directly to plain text using `unpdf`.
2. **DOCX Path:** File is extracted using rule-based parsing (`jszip`, `fast-xml-parser`) to recover lossy fields like fonts, spacing, and table structures, followed by text extraction via `mammoth.js`.

### LangGraph Pipeline (`backend/agent/`)

The core intelligence is powered by a 3-node LangGraph cyclic workflow using Google Gemini (`gemini-2.5-flash` for structured reasoning, `gemini-2.5-flash-lite` for streaming summaries) via `@langchain/google-genai`.

1. **Node 1: Detection & LaTeX Conversion (`node1_detect.js`)**
   - **Inputs:** `document_content`, `document_metadata` (DOCX only), `parsed_guidelines_content`
   - **Operations:** Identifies the target journal and citation style from provided guidelines. Detects all formatting violations (e.g., missing DOIs, duplicate references, heading hierarchy issues, figure label inconsistencies). Converts the complete document into a LaTeX (`.tex`) representation for precise patching.
   - **Output:** Structured JSON of detected issues, full LaTeX source, and a streamed natural-language summary for the user.

2. **Node 2: Fix Generation (`node2_fix.js`)**
   - **Operations:** Generates precise `target` (find) and `replacement` (replace) LaTeX patches for every detected issue.
   - **Looping Logic:** Driven by `state.is_loop` — on the first run, it addresses all found issues. In loop mode (when issues persist), it strictly targets remaining unresolved problems.

3. **Node 3: Critic & Validation (`node3_critic.js`)**
   - **Operations:** Applies the generated exact-match text string patches to the LaTeX document.
   - **Validation:** Performs strict academic validation against the CSL rules and journal parameters (verifying `\cite` to `\bibitem` matches, heading hierarchies, figure conventions). Generates a per-rule compliance scorecard.
   - **Routing:** If unresolved issues remain and iteration limit is not reached, loops back to Node 2 for targeted refinements. If fully compliant, proceeds to file output phase.

### Detect Issues Graph (`backend/agent/detectIssuesGraph.js`)

A separate, lightweight **single-node, stateless** LangGraph used by the Live LaTeX Editor's **"Detect Issues"** button. It does not use a checkpointer and is not part of the main formatting pipeline.

- **Node: `node_detect_issues.js`** — Takes the current LaTeX source and the thread's stored guidelines text, runs a single structured `gemini-2.5-flash` call, and returns a typed JSON payload of `{ target_journal, summary, detected_issues[] }`.
- **Abort on Disconnect:** If the user navigates away mid-request, the Express controller ties an `AbortController` to `req.on('close')` and passes the signal into both `graph.invoke()` and the underlying Langchain `model.invoke()` call, propagating the cancellation all the way to the Gemini API's fetch socket.

### Output Generation
The final, validated LaTeX source is saved and compiled to generate a downloadable PDF alongside a detailed changelog of applied fixes. Users can also use the **Live LaTeX Editor** to revise the output in real time with:
- A **resizable two-column layout**: left column (code editor top / detected issues panel bottom) and right column (live PDF preview). Both splits are independently adjustable by drag.
- A **"Detect Issues"** button that runs the lightweight detection graph on demand and renders a per-rule issue list with expandable detail rows directly below the editor.

---

## Tech Stack

### Frontend
- **Framework:** React 19 + Vite 7
- **Styling:** TailwindCSS v4 + shadcn/ui
- **Icons & Routing:** Lucide React, React Router DOM v7
- **Forms:** React Hook Form, React Dropzone
- **Layout:** `react-resizable-panels` (resizable editor/preview/issues panes)

### Backend & Orchestration
- **API Server:** Node.js + Express 5
- **Agent Framework:** LangGraph (`@langchain/langgraph`), `@langchain/core`, `zod`
- **LLM:** Google Gemini (`gemini-2.5-flash`, `gemini-2.5-flash-lite`) via `@langchain/google-genai`
- **Auth:** Supabase Auth + Google OAuth 2.0 + Passport.js (JWT)
- **Database:** PostgreSQL + Sequelize ORM (Supabase connection pooling)
- **Storage:** Cloudinary (Document/PDF uploads and generated outputs)
- **Extraction Tools:** `unpdf`, `jszip`, `mammoth.js`, `fast-xml-parser`
- **Web Scraping:** Firecrawl (journal guideline extraction)

---

## Project Structure

```text
hackmnd26/
├── backend/                            # Express v5 API server
│   ├── agent/                          # AI agent workflow (LangGraph)
│   │   ├── nodes/                      # Graph nodes
│   │   │   ├── node1_detect.js         # Detection & LaTeX conversion
│   │   │   ├── node2_fix.js            # Fix generation
│   │   │   ├── node3_critic.js         # Critic & validation
│   │   │   └── node_detect_issues.js   # Lightweight live-editor detection node
│   │   ├── prompts/                    # LLM prompts
│   │   │   ├── detect.prompt.js        # Main pipeline detection prompt
│   │   │   ├── fix.prompt.js           # Fix generation prompt
│   │   │   ├── critic.prompt.js        # Critic prompt
│   │   │   └── detect.prompt.live.js   # Live editor detection prompt (LaTeX-native)
│   │   ├── controllers.js              # Agent + detect-issues endpoint logic
│   │   ├── graph.js                    # Main LangGraph orchestration
│   │   ├── detectIssuesGraph.js        # Stateless single-node detection graph
│   │   ├── routes.js                   # Agent API routes
│   │   └── state.js                    # LangGraph global state schemas (Zod)
│   ├── auth/                           # Authentication service
│   ├── clients/                        # External service clients (Supabase, Google OAuth)
│   ├── configs/                        # Configuration (Cloudinary, Passport, Sequelize)
│   ├── document/                       # Document processing endpoints
│   ├── models/                         # Sequelize models (User, Thread)
│   ├── threads/                        # Thread/history management
│   ├── upload/                         # Upload handling / Cloudinary actions
│   ├── utils/                          # Document extractors (DOCX, PDF)
│   └── index.js                        # Express server entry point
└── frontend/                           # React 19 + Vite SPA
    └── src/
        ├── components/ui/              # shadcn UI core components
        │   ├── resizable.jsx           # Resizable panel primitives (react-resizable-panels)
        │   └── ...                     # Other shadcn components
        ├── hooks/                      # React hooks (mobile detection)
        ├── lib/                        # Utility library (cn helper)
        ├── pages/                      # Feature pages
        │   ├── LandingPage.jsx         # Marketing / landing page
        │   ├── LatexEditorPage.jsx     # Live LaTeX editor — resizable layout + Detect Issues panel
        │   ├── LoginPage.jsx           # Login page
        │   ├── RegisterPage.jsx        # Registration page
        │   └── Workspace.jsx           # Main agent workspace
        └── utils/
            ├── actions/                # API actions (auth, stream, upload, document, thread)
            ├── components/             # Shared components (Sidebar, DocumentUpload, etc.)
            ├── contexts/               # React contexts (Auth, Theme)
            └── hooks/                  # Custom hooks (auth, OAuth, logout, theme)
```

---

## Setup & Local Development

### Prerequisites
- Node.js (v18+)
- Supabase project and DB credentials
- Cloudinary Storage
- Google OAuth Application Credentials
- Gemini API Key

### 1. Environment Setup

Create `.env` files in both the frontend and backend directories.

**`backend/.env`**
```env
PORT=4000
NODE_ENV=development
APP_ORIGIN_URL=http://localhost:3000

GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_REDIRECT_URI="http://localhost:4000/api/auth/google/callback"

SUPABASE_PROJECT_URL="..."
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_PG_POOLER="..."

# Gemini LLM (used by all pipeline nodes)
GEMINI_API_KEY="..."
```

**`frontend/.env`**
```env
VITE_BASE_API_ENDPOINT=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID="..."
VITE_GOOGLE_REDIRECT_URI="http://localhost:4000/api/auth/google/callback"
```

### 2. Run the Full Application

**Start the Backend:**
```bash
cd backend
npm install
npm run dev
```

**Start the Frontend:**
```bash
cd frontend
npm install
npm run dev
```

> **Client:** `http://localhost:3000` | **API Base:** `http://localhost:4000/api`
