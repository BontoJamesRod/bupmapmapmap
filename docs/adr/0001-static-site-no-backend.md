# ADR-0001: Static site with no backend and no login

- **Status:** Accepted
- **Date:** 2026-11-07

## Context
SCNavi depended on one person's Firebase project (Auth + Firestore) plus Google Maps and Gemini API keys. The campus data was locked inside it, others couldn't run it, and the login excluded visitors. The new goal is campus *navigation* only.

## Decision
Build BUP Navi as a **static SPA** (Vite + React + TypeScript) hosted on **GitHub Pages**. There is no runtime server, database or authentication. All data processing happens at build time in CI, and all interaction happens in the browser.

## Alternatives considered
| Option | Why not |
|---|---|
| Keep Next.js + Firebase, remove the login | Still tied to someone's Firebase account and billing; needs open read rules; data still not in the repo |
| Next.js with `output: "export"` | Viable, but adds framework weight we don't need (no SSR, no API routes) |
| Supabase/other BaaS | Same account-ownership problem; unnecessary for read-only data |

## Consequences
- ✅ ₱0 hosting, nothing to keep running, no secrets, offline-capable, easy to fork
- ✅ Anyone can run it locally with `npm i && npm run dev`
- ❌ No user-generated content at runtime. Edits go through GitHub PRs and issues instead, which suits our review needs.
- ❌ No server-side analytics or error logging; we accept this for privacy.
