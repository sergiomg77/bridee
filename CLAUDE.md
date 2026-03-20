# Bridee — Claude Code Instructions

## General Rules
- Always read files before writing code, never assume file contents
- Prove bugs with logs before writing fixes
- Never jump to code after more than one error, analyse root cause first
- Keep responses concise, no excessive explanations
- When asked "where is X" or "what does Y do" — just answer, don't add code

## Error Handling
- No silent failures, every catch block must log or throw
- All CRUD operations return { data, error }
- Use centralized logger, not console.log
- Every API call handles success, error, and loading states

## Code Structure
- One component per file
- No business logic in UI components
- All API calls in /services folder
- All types in /types folder
- Folder structure mirrors features

## TypeScript
- TypeScript only, no .js files
- No any types

## Security
- No secrets in code, .env only
- All inputs validated before hitting database

## Git
- Never commit to main directly
- Branch naming: feature/, fix/, chore/
- Commit messages describe what changed

## Project Stack
- React Native + Expo SDK 52
- Supabase for auth and database
- React Navigation for routing
- Node.js + PostgreSQL backend (separate folder)