# AGENTS.md – AI Coding Agent Guidelines for hackmnd26

> This file defines project structure, environment setup, coding conventions, and important rules for AI coding agent working on this codebase. 
> Read this file in full before making any changes and treat the guidelines defined in this file as hard constraints unless the user explicitly says otherwise.


---

## Project Overview

### What the Application Does
<!-- TODO: complete this section -->

### Tech Stack

- Frontend: React 19 + Vite 7 + TailwindCSS v4 + shadcn/ui
- Icons: Lucide React
- Forms: React Hook Form
- Routing: React Router DOM v7
- Backend: Node.js + Express 5
- Auth: Supabase Auth + Google OAuth 2.0 + Passport.js (JWT strategy via JWKS)
- Database: PostgreSQL + Sequelize ORM (via Supabase connection pooling)
- Storage: Cloudinary (Direct PDF & document uploads)

---

## Project Structure

```
hackmnd26/
├── .gitignore
├── README.md
├── AGENTS.md                           # This file
│
├── backend/                            # Express v5 API server
│   ├── .env
│   ├── package.json
│   ├── index.js                        # API entry point — Express setup & middleware
│   ├── clients/                        # Third-party SDK client initializations (googleoauth2.clients.js)
│   ├── configs/                        # Configuration modules (passport, cloudinary, sequelize)
│   ├── utils/                          # Shared utility functions
│   ├── models/                         # Sequelize database models (user.models.js, thread.models.js)
│   ├── upload/                         # Upload handling service area
│   │   ├── routes.js                   # Endpoint routing for signatures & logs
│   │   └── controllers.js              # Cloudinary API interaction logic
│   └── auth/                           # Authentication service
│       ├── routes.js                   # Route definitions for /api/auth/*
│       └── controllers.js              # Handler logic for auth endpoints
│
└── frontend/                           # React 19 + Vite SPA
    ├── .env
    ├── package.json
    ├── index.html                      # HTML shell (Vite entry)
    ├── vite.config.js                  # Vite config — plugins, dev server, aliases
    ├── jsconfig.json                   # Path aliases
    ├── components.json                 # shadcn/ui configuration
    ├── eslint.config.js
    └── src/
        ├── main.jsx                    # React DOM root mount
        ├── App.jsx                     # Root component with router configuration
        ├── index.css                   # Global tailwind styles, shadcn theme vars
        ├── components/ui/              # shadcn/ui primitives (button, input, etc.)
        ├── lib/                        # Utility functions by shadcn (utils.js with cn())
        ├── pages/                      # Route-level page components
        └── utils/
            ├── actions/                # API action/call functions (auth.actions.js)
            ├── components/             # Custom components
            ├── contexts/               # React context providers (ThemeProvider, AuthProvider)
            ├── hooks/                  # Custom react hooks (useAuth, useLogout, useTheme)
            └── ...                     # Other utility files (axios.js, handleAxiosError.js)
```

---

## Build and Test Commands

### Backend Commands

```bash
cd backend

# Development
npm install              # Install dependencies
npm run dev              # Start with nodemon + dotenv (auto-reload)

# Production
npm run start            # Start production server
```

### Frontend Commands

```bash
cd frontend

# Development
npm install              # Install dependencies
npm run dev              # Start dev server (http://localhost:3000)

# Production
npm run build            # Build for production (output: dist/)
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
```

### Quick Start (Full Stack)

```bash
# Terminal 1 - Backend
cd backend && npm install && npm run dev

# Terminal 2 - Frontend
cd frontend && npm install && npm run dev
```

### Adding a shadcn/ui Component

```bash
cd frontend
npx shadcn@latest add <component-name>   # e.g. npx shadcn@latest add dialog
```

> shadcn/ui is configured for **JSX** (not TSX), **new-york** style, and
> **neutral** base color. See `components.json` for full config.

---

## Environment Variables

### `backend/.env`

```env
PORT=4000
NODE_ENV=development
APP_ORIGIN_URL=http://localhost:3000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback

SUPABASE_PROJECT_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_PG_POOLER=
```

### `frontend/.env`

```env
VITE_BASE_API_ENDPOINT=http://localhost:4000/api
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_REDIRECT_URI=http://localhost:4000/api/auth/google/callback
```

> **Rule**: Frontend env vars MUST start with `VITE_` to be exposed to client
> code. Access them via `import.meta.env.VITE_*`.

---

## Code Guidelines — Backend

### Service Module Organization

Each service is a folder with `controllers.js` and `routes.js`:

```
backend/
├── auth/
│   ├── routes.js
│   └── controllers.js
└── <service>/
    ├── routes.js         # Route definitions
    └── controllers.js    # Handler/controller logic
```

---

## Code Guidelines — Frontend

### File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Pages | PascalCase.jsx | `LandingPage.jsx`, `LoginPage.jsx` |
| UI Components (shadcn) | lowercase.jsx | `button.jsx`, `sidebar.jsx` |
| Custom Feature Components | PascalCase.jsx | `ChatSidebar.jsx`, `ChatInput.jsx` |
| Hooks | camelCase.jsx (custom) or kebab-case.js (shadcn) | `useAuth.jsx`, `use-mobile.js` |
| Actions | domain.actions.js | `chat.actions.js`, `auth.actions.js` |
| Contexts | PascalCaseProvider.jsx | `AuthProvider.jsx` |

### Import Patterns

**Use absolute imports with `@/` alias:**

```jsx
// Good - Absolute imports
import { Button } from "@/components/ui/button"
import { useAuth } from "@/utils/hooks/useAuth"

// Acceptable: Relative imports within the same directory or one directory level up
// ./ for the same directory
// ../ for one directory level up

// Not acceptable:
// ../../ or deeper relative paths
```

### Export Patterns

```jsx
// Pages and custom feature components - default export
export default function ChatWindow() { }
export default function ChatInput() { }

// UI components (shadcn) - named exports
export { Button, buttonVariants }
export { Sidebar, SidebarContent, SidebarProvider, useSidebar }

// Action functions - named exports
export async function loginAction({ email, password }) { }
export async function registerAction({ username, email, password }) { }

// Contexts - mixed exports
export const AuthContext = createContext(null)  // Named
export default AuthProvider                     // Default
```

---

## Common Patterns Summary

### Do's

- Prefer using **shadcn/ui components** — install via CLI
- Prefer reading env vars into constants at module scope

### Don'ts

- Don't use `require()` — this project uses ES Modules exclusively
- Don't use TypeScript — the project is pure JavaScript (JSX)
- Don't create `.tsx` files — shadcn is configured for `.jsx`
- Don't use Redux, Zustand, or other state libraries — use React Context
- Don't re-enable `StrictMode` — it's intentionally disabled
- Don't use `dotenv.config()` in source — it's loaded via CLI flag