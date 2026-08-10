# Knowledge Graph & Spaced Repetition System

A personal learning notebook application with a local knowledge graph, automated quiz generation, and adaptive spaced repetition (SM-2).

## Core Capabilities & ML Architecture

- **Entity & Relationship Extraction**: Extracts entities using local pattern-and-dictionary matching, no external API calls required.
- **Keyword Extraction**: Ranks key terms using combined TF-IDF and TextRank graph co-occurrence analysis.
- **Machine Learning**: Difficulty and performance are predicted by small logistic-regression models trained on your own quiz history via SGD, retrained automatically as you review.
- **Spaced Repetition**: Schedules flashcard items using the SM-2 algorithm based on recall grades (0–5).
- **Persistence**: All data persists locally to SQLite.

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Express.js, TypeScript (bundled CommonJS server)
- **Database**: SQLite3 local database

## Development & Production

- **Dev Server**: `npm run dev` (Express + Vite on port 3000)
- **Build**: `npm run build`
- **Start**: `npm start`
