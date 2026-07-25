# Story 16.2: Registration page OG metadata

**Epic:** 16 — One-stop Lite (v1.1)  
**Status:** done  
**Created:** 2026-07-25

## User story

As a community operator sharing a registration link,  
I want real Open Graph metadata on `/register/[slug]`,  
So that WhatsApp, iMessage, and social crawlers show the correct title, description, and hero image.

## Acceptance criteria

**Given** a published activity with an open registration page  
**When** a crawler or messenger fetches `/register/[slug]`  
**Then** the page includes `og:title`, `og:description`, and `og:image` (when hero is set)  
**And** Twitter card metadata mirrors the Open Graph payload  

**Given** a missing, draft, or closed registration page  
**When** metadata is generated  
**Then** the page is marked `noindex` and uses a safe fallback title  

## Implementation notes

- `generateMetadata` on `web/app/(public)/register/[slug]/page.tsx`
- Reuses `buildActivitySharePreview` for consistent copy with the activity share kit
- Absolute OG image URLs resolved from request origin + campaign asset path

## Files

- `web/lib/site-seo-metadata.ts`
- `web/app/(public)/register/[slug]/page.tsx`
