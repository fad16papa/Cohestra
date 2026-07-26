# Story 16.3: Homepage WhatsApp copy in website builder

**Epic:** 16 — One-stop Lite (v1.1)  
**Status:** done  
**Created:** 2026-07-25

## User story

As a community operator publishing my homepage,  
I want to copy a WhatsApp-ready message for my site link,  
So that I can share my homepage in community chats without writing copy from scratch.

## Acceptance criteria

**Given** the website builder publish dialog or site status strip  
**When** I click **Copy WhatsApp**  
**Then** a ready-to-paste message with site headline/name and homepage URL is copied  

**Given** I just published my homepage  
**When** the success dialog appears  
**Then** I can copy the WhatsApp message in addition to the homepage link  

## Implementation notes

- `buildHomepageWhatsAppMessage` in `web/lib/share-kit-utils.ts`
- Publish preview includes Copy link + Copy WhatsApp actions
- Site status strip and post-publish success dialog expose the same action

## Files

- `web/lib/share-kit-utils.ts`
- `web/components/website/website-share-preview.tsx`
- `web/components/website/website-health-strip.tsx`
- `web/components/website/website-builder-page.tsx`
