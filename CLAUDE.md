# Bridee — Claude Code Instructions

## Project Overview
Bridee is a React Native bridal dress discovery app (like Tinder for 
wedding dresses). Brides swipe through real dresses from boutiques, 
save favorites, and virtually try them on using AI.

## Project Structure
E:\SergioApps\Bridee\
    ├── app\        — React Native (Expo SDK 52, TypeScript)
    ├── portal\     — Next.js (boutique partner web portal)
    └── backend\    — Node.js API (not built yet)

## Tech Stack
- Mobile: React Native + Expo SDK 52 + TypeScript
- Auth + DB: Supabase
- Navigation: React Navigation (stack + bottom tabs)
- Portal: Next.js + Tailwind CSS + Supabase
- Backend (planned): Node.js + Express + BullMQ + Redis
- Storage: Supabase Storage (dress-photos public, tryon-photos private)
- AI Try-On: Google virtual-try-on-001 via @google/genai SDK

## Database Schema
The authoritative database schema is at:
E:\SergioApps\Bridee\backend\supabase\schema.sql

Always read this file before writing any database queries.
Never assume column names — read the schema file first.

## Database Rules
- Never write migrations or ALTER TABLE statements
- Never create or drop tables or columns
- All schema changes are planned in Claude.ai and executed
  manually in Supabase SQL Editor
- Photo URLs are never stored — only storage paths
- Full URL for dress photos = SUPABASE_URL +
  /storage/v1/object/public/dress-photos/ + path
- Full URL for boutique logos = SUPABASE_URL +
  /storage/v1/object/public/boutique-logos/ + path
- sort_order = 0 on dress_photos is always the cover photo
- is_tryon_eligible = true means the photo is safe for AI try-on

## Current App State
- Auth screen: sign in, sign up, email confirmation flow
- Bottom navigation: Discover, Saved, Marketplace, Community, Messages
- Discover screen: swipe cards with gesture + buttons, loads from Supabase
- Saved screen: 2-column grid of liked dresses
- Dress detail screen: full info with boutique details
- Portal: Next.js scaffolded with login and dashboard pages

## Image Storage Rules
- Store only file paths in database, never full URLs
- Full URL = SUPABASE_URL + /storage/v1/object/public/dress-photos/ + path
- getDressPhotoUrl() helper in src/lib/supabase.ts constructs full URL
- dress-photos bucket: public
- tryon-photos bucket: private, signed URLs only

## Watermarking (planned)
- Backend burns watermark permanently on upload
- Frontend adds visual overlay as second layer
- Watermark: Bridee text, very light gray PNG, centered

## General Rules
- Always read files before writing code, never assume file contents
- Prove bugs with logs before writing fixes
- Never jump to code after more than one error, analyse root cause first
- Keep responses concise, no excessive explanations
- When asked where is X or what does Y do, just answer, no code

## Error Handling
- No silent failures, every catch block must log or throw
- All CRUD returns { data, error }
- Use logger from src/lib/logger.ts, never console.log
- Every API call handles success, error, and loading states

## Code Structure
- One component per file
- No business logic in UI components
- All API calls in /services folder
- All types in /types folder

## TypeScript
- TypeScript only, no .js files
- No any types

## Security
- No secrets in code, .env only
- .env lives at app\.env and portal\.env.local, never repo root
- All inputs validated before hitting database

## Git
- Never commit to main directly
- Branch naming: feature/, fix/, chore/
- Commit messages describe what changed
