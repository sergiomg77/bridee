# Bridee — Claude Code Instructions

## Project Overview
Bridee is a React Native bridal dress discovery app (like Tinder for
wedding dresses). Brides swipe through real dresses from boutiques,
save favorites, and virtually try them on using AI.

---

## When Opening This Project
1. Read this file fully before doing anything
2. Check which machine you are on (see Machines section)
3. Load the relevant skill from `.claude/skills/` before starting any task
4. Read schema files before writing any database queries — never assume column names

---

## Machines
All paths in code must be relative to the repo root. Never hardcode machine paths.

| Machine | Drive | Repo path |
|---|---|---|
| Desktop PC | E: | `E:\SergioApps\Bridee\` |
| Laptop | C: | `C:\SergioApps\Bridee\` |

⚠️ Laptop is missing `backend/credentials.json` — must be copied from Desktop PC before the AI worker can run.

---

## Project Structure
```
[repo root]/
    ├── app/        — React Native (Expo SDK 52, TypeScript)
    ├── portal/     — Next.js (boutique partner web portal)
    ├── backend/    — Node.js API + AI try-on worker (built)
    └── .claude/
        └── skills/ — On-demand skill files (see Skills section)
```

---

## Tech Stack
- Mobile: React Native + Expo SDK 52 + TypeScript
- Auth + DB: Supabase
- Navigation: React Navigation (stack + bottom tabs)
- Portal: Next.js + Tailwind CSS + Supabase
- Backend: Node.js + Express + TypeScript + DB polling (no Redis)
- Storage: Supabase Storage (dress-photos public, tryon-photos private)
- AI Try-On: Google virtual-try-on-001 via @google/genai SDK

---

## Skills
Load the relevant skill file before starting any matching task.
Full index at `.claude/skills/SKILLS.md`.

| Skill file | Load when... |
|---|---|
| `01-new-machine-setup.md` | Setting up Bridee on a new Windows machine |
| `02-external-sharing-tunneling.md` | Sharing app or portal with external testers |
| `03-notion-spec-to-prompt.md` | Translating a Notion requirements page into a build prompt |
| `04-git-commit-push-workflow.md` | Committing and pushing any completed work |
| `05-backend-health-check.md` | Backend worker not running, stuck jobs, AI errors |
| `06-supabase-private-storage.md` | Any screen displaying images from private Supabase buckets |

---

## Agents
Apply the relevant agent's constraints when working in its domain.

### Frontend Agent
**Owns:** `app/src/`, `portal/src/`, navigation, screens, components
**Never touches:** `backend/`, schema SQL files, .env files
**Key rules:**
- Always use `ScreenHeader` component for screen headers
- User icon always navigates to `ProfileStack` via `navigationRef`
- Private bucket images → always `createSignedUrl()` + `Promise.all()` (see skill 06)
- All Supabase calls go through `/services/` — never in UI components

### Backend Agent
**Owns:** `backend/src/`, `backend/package.json`, `backend/tsconfig.json`
**Never touches:** `app/`, `portal/`, RLS policies
**Key rules:**
- Never call Google AI synchronously — always via queue
- Never commit `credentials.json` or `.env`
- All jobs: pending → processing → completed/failed
- Stuck processing jobs (>5 min) → reset to pending

### Database/Schema Agent
**Owns:** `backend/supabase/` SQL files
**Never touches:** Application code in `app/` or `backend/src/`
**Key rules:**
- Never run destructive SQL without explicit user confirmation
- Never make RLS policies more permissive without flagging it
- Always generate SQL for manual review — never auto-deploy
- Every new table needs RLS policies
- SQL files: `backend/supabase/schema_[feature].sql`

### Notion Scribe Agent
**Owns:** All Notion read/write — build log, specs, documentation
**Never touches:** Code files, .env files, schema files
**Key rules:**
- Log every completed feature to the Build Log (see Notion Pages below)
- Only record what happened — never interpret requirements
- Never write outside Sergio Bridee Technical Notes workspace

---

## Notion Pages (key IDs)
| Page | Notion ID |
|---|---|
| Build Log (log all completed features here) | `32d47394e83d81ad9d59cf0383b89304` |
| Dev Environment Setup | `32947394e83d812aa02dd19eb2e22d7f` |
| Project Overview — Technical | `32b47394e83d8174af52f396cc5faeb7` |
| Backend Architecture | `32d47394e83d8163ac43e917b6b3786a` |
| GitHub & Version Control | `32947394e83d81119c34c2a9aada2edb` |
| User Profile Data (requirements) | `32647394e83d80a190a2d3cbda257d56` |

Build Log entry format: date → Feature → Files created → Files changed → Decisions → TODOs → TypeScript status ✅

---

## Database Schema
Authoritative schema files (relative paths):
- `backend/supabase/schema.sql` — core schema
- `backend/supabase/schema_profile.sql` — user_profiles + bridal_dna_responses

Always read schema files before writing queries. Never assume column names.

## Database Rules
- Never write migrations or ALTER TABLE statements
- Never create or drop tables or columns without explicit confirmation
- All schema changes executed manually in Supabase SQL Editor
- Never store full photo URLs — store paths only
- dress-photos URL = SUPABASE_URL + `/storage/v1/object/public/dress-photos/` + path
- boutique-logos URL = SUPABASE_URL + `/storage/v1/object/public/boutique-logos/` + path
- `sort_order = 0` on dress_photos = cover photo
- `is_tryon_eligible = true` = photo is safe for AI try-on

---

## Current App State

### Mobile App (app/)
**Screens built:**
- Auth: sign in, sign up, email confirmation
- Discover: swipe cards with gestures + buttons, Supabase data
- Saved: 2-column grid of liked dresses
- Dress Detail: full info + boutique details
- Try On: results grid, signed URLs, red dot badge for unseen results
- Try On Detail: full-screen result + View Dress button
- Profile (modal hub): General Information, Bridal DNA, Share Your Story, Shopping Preferences, Build Your Moodboard, Settings
- General Information: role, name, city (VN-first), comms preference, age, wedding date, height, weight, body shape
- Bridal DNA: 8-question quiz, one at a time, upserts to bridal_dna_responses
- Settings: avatar placeholder + logout
- Marketplace, Community, Messages: placeholder screens with ScreenHeader

**Shared components:**
- `app/src/components/shared/ScreenHeader.tsx` — title + optional filter icon + user icon → ProfileStack
- `app/src/navigation/navigationRef.ts` — global nav ref for use outside component tree

**Navigation structure:**
```
RootStack
  ├── MainTabs (bottom tabs)
  │     ├── DiscoverStack
  │     ├── SavedStack
  │     ├── TryOnStack → TryOnResultsScreen → TryOnResultDetailScreen → DressDetailScreen
  │     ├── MarketplaceStack
  │     ├── CommunityStack
  │     └── MessagesStack
  └── ProfileStack (modal)
        └── ProfileScreen → GeneralInformation / BridalDNA / Settings / placeholders
```

### Portal (portal/)
- Next.js with login, dashboard, boutique profile (edit info, logo upload)

### Backend (backend/)
- Worker polls `tryon_queue` every 10 seconds
- Flow: pending → processing → download photos → Google AI → upload result → completed/failed
- Requires: `backend/.env` + `backend/credentials.json` (⚠️ missing on Laptop)

---

## Image Storage Rules
- `dress-photos` bucket: **public** → `getPublicUrl()`
- `tryon-photos` bucket: **private** → `createSignedUrl(path, 3600)` always
- Resolve multiple signed URLs in parallel with `Promise.all()` — never sequentially
- Never cache or store signed URLs — regenerate on every screen mount
- Helpers in `app/src/lib/supabase.ts`: `getDressPhotoUrl()` and `getTryOnResultUrl()`

---

## General Rules
- Always read files before writing code — never assume file contents
- Prove bugs with logs before writing fixes
- Never jump to code after more than one error — analyse root cause first
- Keep responses concise, no excessive explanations
- When asked where X is or what Y does — just answer, no code
- Never hardcode machine paths — always use relative paths from repo root

## Error Handling
- No silent failures — every catch block must log or throw
- All CRUD returns `{ data, error }`
- Use logger from `src/lib/logger.ts` — never `console.log`
- Every API call handles success, error, and loading states

## Code Structure
- One component per file
- No business logic in UI components
- All API calls in `/services/[domain]/`
- All types in `/types/`
- Screens in `app/src/screens/[domain]/`
- Shared components in `app/src/components/shared/`

## TypeScript
- TypeScript only — no `.js` files
- No `any` types
- Run `npx tsc --noEmit` after every change to verify clean compile

## Security
- No secrets in code — `.env` only
- `app/.env` — Expo Supabase keys
- `portal/.env.local` — Portal Supabase keys
- `backend/.env` — service role key + GCP config
- `backend/credentials.json` — GCP service account, never committed

## Git
- Never commit to `main` directly
- Branch naming: `feature/`, `fix/`, `chore/`, `refactor/`
- Commit messages: lowercase, no period, describe what changed
  - `feat: add bridal DNA quiz screen`
  - `fix: resolve duplicate key warning in city picker`
  - `chore: add skills system and update CLAUDE.md`
- Never commit: `.env`, `credentials.json`, `node_modules/`, `dist/`
