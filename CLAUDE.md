# Bridee — Claude Code Instructions

## Project Overview
Bridee is a React Native bridal dress discovery app (like Tinder for
wedding dresses). Brides swipe through real dresses from boutiques,
save favorites, and virtually try them on using AI.

## Project Root
This file lives at the root of the Bridee repo. All paths in this file
are relative to the repo root. Never hardcode machine-specific paths
like `C:\` or `E:\` — use relative paths only.

```
[repo root]/
    ├── app\        — React Native (Expo SDK 52, TypeScript)
    ├── portal\     — Next.js (boutique partner web portal)
    ├── backend\    — Node.js API + AI try-on worker
    └── .claude\    — Skills and agent definitions
        └── skills\
```

Known machine locations (for reference only — never use in code):
- Machine 1 (old): `E:\SergioApps\Bridee\`
- Machine 2 (new): `C:\SergioApps\Bridee\`

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
Skills are loaded on demand from `.claude/skills/`. Before starting any
task that matches a trigger, read the relevant skill file first.
See `.claude/skills/SKILLS.md` for the full index.

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
Specialized agents own specific domains. When working in a domain,
apply that agent's constraints and guardrails.

### Frontend Agent
**Owns:** `app/src/`, `portal/src/`, navigation, screens, components
**Never touches:** `backend/`, schema SQL files, .env files
**Key rules:**
- Always use `ScreenHeader` component for screen headers
- Navigate to ProfileStack (not ProfileScreen) from user icon
- Use `navigationRef` for navigation outside of component tree
- Private bucket images → always `createSignedUrl()` + `Promise.all()` (see skill 06)
- All API calls go through `/services/` folder, never in UI components

### Backend Agent
**Owns:** `backend/src/`, `backend/package.json`, `backend/tsconfig.json`
**Never touches:** `app/`, `portal/`, RLS policies, commits credentials
**Key rules:**
- Never call Google AI synchronously — always via queue
- Never expose service role key in logs or responses
- Never commit `credentials.json` or `.env`
- All jobs must handle: pending → processing → completed/failed
- Stuck processing jobs (>5min) should be reset to pending

### Database/Schema Agent
**Owns:** `backend/supabase/` SQL files, Supabase schema
**Never touches:** Application code in `app/` or `backend/src/`
**Key rules:**
- Never run destructive SQL without explicit user confirmation
- Never make RLS policies more permissive without flagging it
- Always generate SQL files for manual review — never auto-deploy
- Every new table needs RLS policies
- SQL files saved to `backend/supabase/schema_[feature].sql`

### Notion Scribe Agent
**Owns:** All Notion read/write — build log, specs, documentation
**Never touches:** Code files, .env files, schema files
**Key rules:**
- Log every completed feature to the Build Log page
- Only record what happened — never interpret or modify requirements
- Never write outside Sergio Bridee Technical Notes workspace
- Always update paths/configs in Notion when they change in code

---

## Database Schema
Authoritative schema files (relative paths):
- `backend/supabase/schema.sql` — core schema
- `backend/supabase/schema_profile.sql` — user_profiles + bridal_dna_responses

Always read the schema file before writing any database queries.
Never assume column names — read the schema file first.

## Database Rules
- Never write migrations or ALTER TABLE statements
- Never create or drop tables or columns without explicit confirmation
- All schema changes are planned in Claude.ai and executed manually in Supabase SQL Editor
- Photo URLs are never stored — only storage paths
- Full URL for dress photos = SUPABASE_URL + /storage/v1/object/public/dress-photos/ + path
- Full URL for boutique logos = SUPABASE_URL + /storage/v1/object/public/boutique-logos/ + path
- sort_order = 0 on dress_photos is always the cover photo
- is_tryon_eligible = true means the photo is safe for AI try-on

---

## Current App State

### Mobile App (app/)
- Auth screen: sign in, sign up, email confirmation flow
- Bottom navigation: Discover, Saved, Try On, Marketplace, Community, Messages
- Discover screen: swipe cards with gesture + buttons, loads from Supabase
- Saved screen: 2-column grid of liked dresses
- Dress detail screen: full info with boutique details
- Try On screen: results grid with signed URLs, red dot badge for unseen
- Try On detail screen: full-screen result, View Dress button
- Profile (modal): hub with General Information, Bridal DNA, Share Your Story, Shopping Preferences, Build Your Moodboard, Settings
- General Information: basics (role, name, city VN-first, comms, age, wedding date) + body figure (height, weight, body shape visual grid)
- Bridal DNA: 8-question quiz, one at a time, stores to bridal_dna_responses
- Settings: avatar placeholder + logout

### Shared Components
- `app/src/components/shared/ScreenHeader.tsx` — reusable header with title, optional filter icon, user icon. User icon navigates to ProfileStack via navigationRef.
- `app/src/navigation/navigationRef.ts` — global NavigationContainerRef for navigation outside component tree

### Navigation Structure
```
RootStack (modal)
  ├── MainTabs (bottom tabs)
  │     ├── DiscoverStack
  │     ├── SavedStack
  │     ├── TryOnStack → TryOnResultsScreen → TryOnResultDetailScreen → DressDetailScreen
  │     ├── MarketplaceStack
  │     ├── CommunityStack
  │     └── MessagesStack
  └── ProfileStack (modal) → ProfileScreen → GeneralInformation / BridalDNA / Settings / placeholders
```

### Portal (portal/)
- Next.js scaffolded with login and dashboard pages
- Boutique profile page (edit info, logo upload)

### Backend (backend/)
- Node.js + TypeScript worker
- Polls `tryon_queue` every 10 seconds for pending jobs
- Processes: download photos → call Google AI → upload result → update status
- Requires: `backend/.env` + `backend/credentials.json` (never committed)

---

## Image Storage Rules
- Store only file paths in database, never full URLs
- `dress-photos` bucket: **public** → use `getPublicUrl()`
- `tryon-photos` bucket: **private** → ALWAYS use `createSignedUrl(path, 3600)`
- Resolve multiple signed URLs in parallel with `Promise.all()` — never sequentially
- Never cache signed URLs across sessions — regenerate on every mount
- `getDressPhotoUrl()` helper in `app/src/lib/supabase.ts` for dress photos
- `getTryOnResultUrl()` helper in `app/src/lib/supabase.ts` for try-on results

---

## Watermarking (planned)
- Backend burns watermark permanently on upload
- Frontend adds visual overlay as second layer
- Watermark: Bridee text, very light gray PNG, centered

---

## General Rules
- Always read files before writing code, never assume file contents
- Prove bugs with logs before writing fixes
- Never jump to code after more than one error, analyse root cause first
- Keep responses concise, no excessive explanations
- When asked where is X or what does Y do, just answer, no code
- Never hardcode machine paths — always use relative paths from repo root

## Error Handling
- No silent failures, every catch block must log or throw
- All CRUD returns { data, error }
- Use logger from `src/lib/logger.ts`, never console.log
- Every API call handles success, error, and loading states

## Code Structure
- One component per file
- No business logic in UI components
- All API calls in `/services/` folder
- All types in `/types/` folder
- Screens in `app/src/screens/[domain]/`
- Services in `app/src/services/[domain]/`
- Shared components in `app/src/components/shared/`

## TypeScript
- TypeScript only, no .js files
- No `any` types
- Run `npx tsc --noEmit` after every change to verify clean compile

## Security
- No secrets in code, .env only
- `app/.env` — Expo app Supabase keys
- `portal/.env.local` — Portal Supabase keys
- `backend/.env` — Backend Supabase service role key + GCP config
- `backend/credentials.json` — GCP service account, never committed
- All inputs validated before hitting database

## Git
- Never commit to main directly
- Branch naming: `feature/`, `fix/`, `chore/`, `refactor/`
- Commit messages: lowercase, describe what changed, no period
  - `feat: add bridal DNA quiz screen`
  - `fix: resolve duplicate key warning in city picker`
  - `chore: install navigation dependencies`
- Never commit: `.env`, `credentials.json`, `node_modules/`, `dist/`

---

## Notion Build Log
After every completed feature, log it to the Build Log page in Notion.
Page: "Claude Code — Build Log" in Sergio Bridee Technical Notes.
Format: date → Feature name → Files created → Files changed → Decisions → TODOs → TypeScript status.
