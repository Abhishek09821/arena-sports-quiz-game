# ARENA — Sports Quiz MVP

A UI-first sports quiz prototype for 1990–2026, built around fast gameplay, smooth motion, subtle audio feedback and a database-ready architecture.

## Stack

- Next.js 16.3.3 + React 19.3 + TypeScript
- Motion for React for gameplay transitions and micro-interactions
- Zustand for local game state
- Supabase Postgres + Realtime for the multiplayer/database layer
- Web Audio API for lightweight generated UI sounds
- Plain CSS tokens/components in this MVP; Tailwind can be layered in without changing the architecture

Next.js 16.3.3 is the current Active LTS line as of September 2026, and React 19.3 is the current stable React release. Motion supports high-performance React animations and Supabase Realtime supports Broadcast/Presence patterns for game events and synchronized state.

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000

## Supabase

1. Create a Supabase project.
2. Put the project URL and publishable key in `.env.local`.
3. Run `supabase/migrations/001_initial.sql` in the Supabase SQL editor.
4. Mark production questions `verified = true` before making them publicly readable.

## Current MVP

- Home / landing
- Solo rounds: 5 / 10 / 15 / 20 questions
- 8 sports
- Four difficulty levels: Easy / Medium / Hard / Legendary
- Original starter question bank
- Random question selection and no-repeat within a round
- Speed-aware scoring and streaks
- Timer with escalating subtle ticks
- Correct / wrong / win / lose audio generated with Web Audio API
- Motion-based question transitions and tap feedback
- Challenge Mode: exactly 10 custom questions via JSON
- Multiplayer room UI with Supabase Realtime ping/broadcast prototype

## Production next steps

1. Move all public questions into Supabase and expand the bank substantially.
2. Add the verified-question ingestion pipeline: ingest → rewrite → dedupe → fact-check → difficulty scoring → publish.
3. Make multiplayer server-authoritative so clients cannot spoof buzzers or scores.
4. Add PDF/CSV import for private Challenge Mode.
5. Add no-login player profiles later, preserving guest play.
6. Add analytics for question accuracy, abandonment, average response time and question-repeat exposure.
