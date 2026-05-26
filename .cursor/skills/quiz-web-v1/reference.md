# QuizHub — extended reference

## Repository

- **Name**: quizWebV1 (product name: **QuizHub**)
- **Git remote**: `origin/main` (standard monorepo-style layout: separate `frontend/` and `backend/` packages, no root `package.json`)

## Frontend dependencies (key)

| Package | Version | Role |
|---------|---------|------|
| react / react-dom | ^19 | UI |
| vite | ^8 | Dev server & build |
| tailwindcss | ^4 | Styling via `@tailwindcss/vite` |
| typescript | ~6 | Types |

Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm preview` (all from `frontend/`).

## Backend dependencies (key)

| Package | Version | Role |
|---------|---------|------|
| express | ^5 | HTTP server |
| cors | ^2 | Cross-origin for Vite dev |
| prisma / @prisma/client | ^7 | ORM (not integrated in server yet) |
| dotenv | ^17 | Env (not required for current routes) |

Scripts: `pnpm dev` → nodemon on `src/server.ts`.

## Environment & ports

| Service | Default URL |
|---------|-------------|
| Backend | `http://localhost:3000` |
| Frontend (Vite) | `http://localhost:5173` (typical) |

No `.env` contract documented yet. CORS is open (`app.use(cors())`).

## Data files (`backend/src/files/`)

| File | Purpose |
|------|---------|
| `userData.json` | Intended store for signup payloads (write logic incomplete) |
| `userData.csv` | CSV export / alternate format (untracked in git status sometimes) |
| `read.txt` | Sample file for fs experiments (commented in server.ts) |

## TypeScript / tooling

- Frontend: `tsconfig.app.json`, `tsconfig.node.json`, ESLint flat config.
- Backend: path alias `#root/*` → `./src/*` in `package.json` imports.
- IDE: `.idea/` JetBrains config present.

## UI / design reference

| Token / class | Value / use |
|---------------|-------------|
| `brand-600` | Primary blue `#2563eb` — buttons, logo, links |
| `brand-700` | Hover state for primary actions |
| `text-ink` | Headings, primary text (`#0f172a`) |
| `text-muted` | Body copy (`#475569`) |
| `border-line` | Borders (`#e2e8f0`) |
| Background | White + `page-texture` dot pattern; sections use `bg-brand-50/40` |
| Fonts | Fraunces (display), Source Sans 3 (body) |

**Design skill**: `skills/frontend-design.md` — use for landing/marketing UI; keep user constraints (light, blue, professional).

Keep new pages in **light mode** unless the user explicitly requests dark mode.

## Known quirks

1. `Form.tsx` sends **password in plain JSON** — acceptable for local dev only; hash + HTTPS before production.
2. `ShowGreet` exists but is not mounted on the landing page.
3. `POST /sendForm` does not fully persist to `userData.json` yet.

## Suggested roadmap (for agents)

1. Persist `POST /sendForm` to `userData.json` or Prisma model.
2. Add React Router: `/quiz/:id`, `/create`, `/dashboard`.
3. Auth: sessions or JWT; stop sending raw passwords.
4. Quiz schema: questions[], options[], correctIndex, timer.
5. Player UI: one question per screen, score summary.

## File edit map

| User goal | Primary files |
|-----------|-----------------|
| Landing copy / layout | `frontend/src/pages/Home.tsx` |
| Navigation | `frontend/src/pages/Header.tsx` |
| Signup / registration | `frontend/src/pages/Form.tsx`, `backend/src/server.ts` |
| Global styles / tokens | `frontend/src/index.css` |
| New API | `backend/src/server.ts` |
| Agent context | `.cursor/skills/quiz-web-v1/SKILL.md` (this skill) |
