# ARENA — Sports Quiz Platform

A high-performance, production-ready sports quiz platform covering 1990–2026 across 8 major sports disciplines. Built around rapid-fire gameplay, fluid 60fps animations, procedural Web Audio effects, and a complete Supabase Postgres + Realtime multiplayer foundation.

![Arena Sports Quiz](public/arena-mark.svg)

---

## Architecture & Tech Stack

- **Framework**: Next.js 16.3.3 (App Router, Turbopack)
- **Runtime**: React 19.3 + TypeScript 5.8
- **Styling**: Modern CSS design system with CSS custom properties, responsive layout, glassmorphism, and Tailwind CSS / PostCSS toolchain
- **Motion & Micro-interactions**: `motion/react` (Framer Motion v12)
- **State Management**: `zustand` with persistence and deep game tracking
- **Database & Realtime**: Supabase Postgres (RLS, triggers, indexes, seed data) + Realtime Broadcast & Presence
- **Audio Engine**: Zero-dependency procedural Web Audio API synthesizer (no external MP3/WAV assets needed)
- **Testing & Quality**: 45 unit tests executed with `npx tsx`, ESLint flat config with 0 warnings

---

## Features

### 1. Solo Play Mode (`/play`)
- Configure round size (5, 10, 15, 20, or 30 questions)
- Filter by sport (Cricket, Football [FIFA Soccer], Basketball, Tennis, Formula 1, Badminton, Hockey, Athletics, or All Sports)
- Filter by difficulty (Easy, Medium, Hard, Legendary, or Mixed)
- Dynamic countdown timer adapted to question difficulty (30s down to 16s)
- Speed bonus scoring calculation + exponential streak multiplier capped at +200
- Procedural audio feedback for correct answers, mistakes, streak milestones, and round finish
- Detailed post-game results breakdown with accuracy, answer history, and review

### 2. Sprint Mode (`/sprint`)
- 60-second high-intensity rapid-fire round
- Fast answer selection with instant progression
- Live streak tracking with escalating tick indicators
- Dynamic performance grade calculation (Legendary, Elite, Veteran, Contender, Rookie)

### 3. Challenge Mode (`/challenge`)
- Create custom private rounds with AI single-question generator or manual entry
- Import via custom JSON or standard CSV, export questions to JSON/CSV
- Download sample templates directly from the UI
- Strict schema validation checking sport tags, difficulty, 4 choices, valid answers, and duplicates
- Shareable challenge preview and instant play with 6-character access codes

### 4. Admin Management Portal (`/admin`)
- Complete telemetry dashboard with metrics by sport, difficulty, user accounts, and quiz sessions
- Role-based security (admin only) enforced server-side via Supabase profiles
- Live question logs and session inspection

### 5. Realtime Multiplayer (`/multiplayer`)
- Room creation and code-based joining (e.g. `ARENA-7291`)
- Realtime presence tracking of connected opponents
- Synchronized question bank and buzzer/scoring events via Supabase Realtime Channels
- Graceful offline simulation when Supabase credentials are not configured

### 6. Question Bank & AI Synthesis (`lib/services/ai_question_generator.ts`)
- Dynamically synthesized trivia via multi-provider AI (Google Gemini, Groq, OpenRouter, OpenAI) with resilient offline fallback
- Balanced across 8 sports: Football (Association Football / FIFA Soccer strictly, NO American Football/NFL), Cricket, Basketball (NBA), Tennis, Formula 1, Badminton, Hockey, and Athletics
- Every question contains rich metadata: `id`, `sport`, `difficulty`, `year`, `explanation`, and `source`

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+

### Installation

```bash
git clone <repository-url>
cd arena-sports-quiz-mvp
npm install
```

### Environment Configuration

Copy the sample environment file:

```bash
cp .env.example .env.local
```

For local testing without Supabase, the application gracefully degrades with built-in fallbacks. For full database and realtime multiplayer support, supply your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

### Running Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server on port 3000 |
| `npm run build` | Compile and verify production build with Turbopack |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint with zero-warning threshold across all directories |
| `npm test` | Run the 45-case test suite covering scoring, validation, timers, and data integrity |

---

## Database & Migrations

Database setup files are located in `supabase/`:

1. **`supabase/migrations/001_initial.sql`**:
   - `questions` table with validation constraints and generated tsvector fulltext search
   - `quiz_sessions` table with round history, difficulty, and player reference
   - `player_answers` table tracking question-by-question telemetry
   - `multiplayer_rooms` table supporting lobby codes and live rounds
   - `leaderboard_entries` table with automated view `leaderboard_summary`
   - Row Level Security (RLS) policies for verified questions and authenticated players
   - Performance indexes on sport, difficulty, tags, and timestamps

2. **`supabase/seed.sql`**:
   - Automated SQL seed script pre-populating verified questions into Supabase Postgres

---

## Project Structure

```
arena-sports-quiz-mvp/
├── app/
│   ├── admin/             # Question manager & bulk import portal
│   ├── challenge/         # Custom JSON/CSV challenge creator
│   ├── multiplayer/       # Realtime room lobby and live duel
│   ├── play/              # Solo game loop
│   ├── sprint/            # 60s rapid-fire sprint mode
│   ├── globals.css        # Design tokens, typography, glassmorphism
│   ├── layout.tsx         # Root layout with ArenaHeader and metadata
│   └── page.tsx           # Home landing page with game mode cards
├── components/
│   ├── ArenaHeader.tsx    # Global sticky navigation with sound toggle
│   ├── QuizGame.tsx       # Core question rendering & timer loop
│   ├── ResultsScreen.tsx  # Game review, accuracy, and score breakdown
│   └── SprintGame.tsx     # 60-second speed challenge engine
├── data/
│   └── questions.ts       # 88 curated verified questions (1990–2026)
├── lib/
│   ├── analytics.ts       # Performance & gameplay telemetry
│   ├── audio.ts           # Web Audio API procedural sound synthesizer
│   ├── quiz.ts            # Round builder, filtering, and shuffle logic
│   ├── scoring.ts         # Speed, streak, and difficulty score calculations
│   ├── store.ts           # Zustand global store with persistence
│   ├── supabase.ts        # Supabase client initialization
│   └── validation.ts      # Question schema, duplicate checker, CSV parser
├── supabase/
│   ├── migrations/        # Production Postgres schema & RLS policies
│   └── seed.sql           # Database seed script
└── tests/
    └── core.test.ts       # Automated test suite (45 assertions)
```

---



### Question quality and theme update

Apply `supabase/migrations/003_question_history.sql` before deploying this update.
Authenticated generation now requires the history table and reservation function;
it stops with an actionable error if history cannot be read or saved. History is
append-only, shared across modes, and reserves exact normalized questions atomically
across tabs. Anonymous play uses browser history, which is no longer silently trimmed.
Clearing browser storage still removes anonymous history. Older questions already
removed by previous history limits cannot be reconstructed.

Every generated deck passes selection validation, a separate AI factual/difficulty
review, replacement retries, and a final count/duplicate audit. Mixed decks contain
Medium, Hard and Easy slots. Unsupported or exhausted selections return an error;
the app no longer substitutes generic offline questions or a shorter deck. Imported,
saved and shared challenges are reviewed and repaired at play time, so repeated or
rejected questions can differ from the original challenge. Multiplayer checks the
joining player's browser history before starting and replaces an overlapping deck.

AI review is an additional quality gate, **not independent source verification**.
It cannot establish perfect factual accuracy or detect every semantic paraphrase.
Provider access is required, and review adds latency and API usage. Historical
selection checks and replacement logic are tested using deterministic provider doubles;
live provider accuracy must also be sampled before release.

The interface supports per-sport accents and a persistent light/dark preference.
Use `npm test`, `npx tsc --noEmit`, and `npm run build` for validation.
