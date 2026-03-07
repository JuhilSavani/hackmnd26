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

The core intelligence is powered by a 3-node LangGraph cyclic workflow using Anthropic Claude (claude-sonnet-4-6) or Google Gemini models via `@langchain/google-genai`.

1. **Node 1: Detection + LaTeX Conversion (`node1_detect.js`)**
   - **Inputs:** `document_content`, `document_metadata` (DOCX only), `parsed_guidelines_content`
   - **Operations:** Identifies target journal guidelines and existing formatting issues (e.g., missing DOIs, duplicate references, hierarchy violations). Converts the complete document into a `.tex` standard representation.
   - **Output:** Extracts structured JSON of formatting issues and streams a summary to the user.

2. **Node 2: Fix Generation (`node2_fix.js`)**
   - **Operations:** Generates precise `target` (find) and `replacement` (replace) LaTeX patches for every detected issue. 
   - **Looping Logic:** Driven by `state.is_loop`, on the first run, it addresses all found issues. In loop mode (when issues persist), it strictly targets remaining unresolved problems securely.

3. **Node 3: Critic & Validation (`node3_critic.js`)**
   - **Operations:** Applies the generated exact-match text string patches to the LaTeX document. 
   - **Validation:** Performs strict academic validation against the CSL rules and journal parameters (verifying `\cite` to `\bibitem` matches, heading hierarchies, figure conventions).
   - **Routing:** If unresolved issues remain and iteration limit is not reached, loops back to Node 2 for targeted refinements. If fully compliant, proceeds to file output phase.

### Output Generation
The final, validated LaTeX source is saved and compiled to generate a downloadable final version file alongside a detailed changelog of applied fixes.

---

## Tech Stack

### Frontend
- **Framework:** React 19 + Vite 7
- **Styling:** TailwindCSS v4 + shadcn/ui
- **Icons & Routing:** Lucide React, React Router DOM v7

### Backend & Orchestration
- **API Server:** Node.js + Express 5
- **Agent Framework:** LangGraph (`@langchain/langgraph`), `@langchain/core`, `zod`
- **LLMs:** Anthropic Claude (claude-sonnet-4-6) / Google Gemini Models
- **Auth:** Supabase Auth + Google OAuth 2.0 + Passport.js (JWT)
- **Database:** PostgreSQL + Sequelize ORM (Supabase connection pooling)
- **Storage:** Cloudinary (Document/PDF uploads and generated outputs)
- **Extraction Tools:** `unpdf`, `jszip`, `mammoth.js`, `fast-xml-parser`

---

## Project Structure

```text
hackmnd26/
├── backend/                            # Express v5 API server
│   ├── agent/                          # AI agent workflow (LangGraph)
│   │   ├── nodes/                      # Graph nodes (detect, fix, critic)
│   │   ├── prompts/                    # LLM Prompts
│   │   ├── graph.js                    # LangGraph orchestration
│   │   └── state.js                    # LangGraph global state schemas (Zod)
│   ├── auth/                           # Authentication service
│   ├── document/                       # Document processing endpoints
│   ├── threads/                        # Thread/history management
│   └── upload/                         # Upload handling / Cloudinary actions
├── frontend/                           # React 19 + Vite SPA
│   ├── src/
│   │   ├── components/ui/              # shadcn UI core components
│   │   ├── pages/                      # Feature pages
│   │   └── utils/actions/              # API actions/calls (auth, stream, upload)
```

---

## Setup & Local Development

### Prerequisites
- Node.js (v18+)
- Supabase project and DB credentials
- Cloudinary Storage
- Google OAuth Application Credentials
- API key for Anthropic/Gemini Langchain configurations

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

# For Local LLM Pipeline Nodes:
GOOGLE_API_KEY="..."
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
