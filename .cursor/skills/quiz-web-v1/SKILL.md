---
name: quiz-web-v1
description: >-
  Develop and extend QuizHub (quizWebV1)—a React + Tailwind frontend and Express
  backend quiz platform. Use when working in quizWebV1, QuizHub, quiz features,
  signup form, API routes, or landing page UI in this repository.
---

# QuizHub (quizWebV1)

## Quick reference

| Layer | Path | Stack |
|-------|------|-------|
| Frontend | `frontend/` | React 19, Vite 8, TypeScript, Tailwind CSS v4 |
| Backend | `backend/` | Express 5, Node, TypeScript, Prisma (installed, not wired yet) |
| Package manager | repo root uses **pnpm** per `backend/package.json` devEngines |

## Run locally

```bash
# Terminal 1 — API (port 3000)
cd backend && pnpm dev

# Terminal 2 — UI (Vite default, usually 5173)
cd frontend && pnpm dev
```

Frontend calls `http://localhost:3000` for API requests (no env proxy yet).

## Project layout

```
quizWebV1/
├── frontend/src/
│   ├── App.tsx              # Shell: Header + Home landing
│   ├── index.css            # Tailwind v4 @theme tokens, fonts, utilities
│   ├── main.tsx
│   ├── pages/
│   │   ├── Header.tsx       # Sticky nav
│   │   ├── Home.tsx         # Landing sections (hero, features, signup)
│   │   ├── Form.tsx         # Signup POST → /sendForm
│   │   └── showGreeting.tsx # Fetches /getGreet (not on landing yet)
│   ├── components/
│   │   └── InteractiveQuizCard.tsx  # Reusable demo quiz (random Q, animations)
│   ├── data/sampleQuizQuestions.ts
│   ├── types/quiz.ts
│   └── services/getGreet.ts
├── backend/src/
│   ├── server.ts            # Express app + routes
│   └── files/               # userData.json, userData.csv, read.txt
└── .cursor/skills/quiz-web-v1/
```

## API endpoints

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/` | — | `{ message: "Backend working!" }` |
| GET | `/getGreet` | — | `{ message: "Hello, How are you?" }` |
| POST | `/sendForm` | `{ email, password, username, phone }` | `{ success: true }` |

`POST /sendForm` logs body and resolves `userData.json` path but persistence is incomplete—extend before production.

## Design system (frontend)

Read `frontend/src/index.css` for tokens. For new UI work, also follow **`skills/frontend-design.md`** (refined minimal, distinctive—not generic template UI).

Conventions:

- **Mode**: Light only — white background, no dark theme unless user asks.
- **Fonts**: Plus Jakarta Sans (Slido-like SaaS sans).
- **Primary color**: Blue via `brand-*` (`brand-600` = `#2563eb`, hover `brand-700`).
- **Semantic tokens**: `text-ink`, `text-muted`, `border-line`, `bg-surface-soft`, `bg-surface-muted`.
- **Layout**: Slido-inspired—top participant bar, rounded-full CTAs, centered hero, feature grid, testimonials, blue CTA band, multi-column footer (`Footer.tsx`).
- **Product demo**: `InteractiveQuizCard` inside `.product-frame` in hero.
- **Sections** (anchor IDs): `#features`, `#how-it-works`, `#signup`.
- **Brand name**: QuizHub.

When adding UI: `rounded-lg` buttons/cards, left-accent feature cards (`border-l-brand-500`), CTA `bg-brand-600`, hero uses `<InteractiveQuizCard />` for the live demo.

**Reusable quiz demo**: `InteractiveQuizCard` — shuffled unique questions (no repeats in a session), default **4 free answers** then sign-up gate. Props: `questions`, `freeQuestionLimit`, `advanceDelay`, `signUpHref`, `signInHref`, `onAnswer`, `onFreeLimitReached`, `className`.

## Conventions

- TypeScript throughout; `.tsx` pages under `frontend/src/pages/`.
- Tailwind v4: `@import "tailwindcss"` and `@theme` in `index.css` (not `tailwind.config.js`).
- React Compiler enabled via Vite babel plugin.
- Fetch from components or thin `services/` modules; no React Router yet (single-page landing).
- Backend: ESM (`"type": "module"`), CORS enabled, port **3000**.

## Current product state

**Done**

- Simple light-mode landing (hero, features, steps, signup form, footer).
- Signup form wired to `POST /sendForm`.
- Header with section anchors.

**Not yet built**

- Quiz CRUD, question editor, quiz player, auth/sessions, DB (Prisma present but unused).
- `ShowGreet` demo component exists but is not mounted on the home page.
- Form data not fully persisted to `userData.json`.

## Common tasks

**Add a new page/route**

1. Create component in `frontend/src/pages/`.
2. Add React Router (not installed) or conditional render in `App.tsx`.
3. Link from `Header.tsx`.

**Add API route**

1. Edit `backend/src/server.ts`.
2. Add matching `fetch` in `frontend/src/services/` or page component.
3. Document in [reference.md](reference.md).

**Extend landing**

- Edit `Home.tsx` for sections; keep section `id`s for nav anchors.
- Reuse `Form.tsx` or extract shared input classes from it.

## Additional resources

- Full stack notes, file paths, and data files: [reference.md](reference.md)
