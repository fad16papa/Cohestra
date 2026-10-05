# Party 42.4 — smallest remaining continuity change

Date: 2026-10-05  
Cast: John (PM), Sally (UX), Winston (Architect)  
Question: What is the smallest remaining Story 42.4 change that makes Build, Preview and Publish feel continuous across Creation Studios without reopening completed builder architecture?

---

**John:** The mental model already exists in code. Build edits a draft. Preview shows that draft. Publish on Overview makes the saved draft public. Header says Published. Form says Live. Website already has a real success dialog. Do not invent a second publish product on the Form tab. The hole I will not ship without: if I dirty a live form, I cannot confidently return to saved/published truth. That is Revert for Form — discard unsaved — not Unpublish.

**Sally:** I opened a published Form at 1440. First fold is launch-template cards. Composition is a scroll away, under Intro, Closed, Website, Close-at, thank-you. Operators who already have a form do not need a gallery in their face. Collapse Templates when fields exist. Put **Go to composition** in the sticky save bar so it is on the first fold at every width. Do not reorder the #388 Website connection. Do not restyle Preview to look like Website's fake browser.

**Winston:** AD-8 is already correct. Preview unmounts. If anyone keep-mounts PublicRegistrationOpen behind `hidden` or `display:none`, I will fail the story. Revert is `setDraftSchema(saved)`. Named region is an attribute, not a new shell. No FormStudioPreviewRendererV2. No schema expansion. Skip a new architecture spine — I am ratifying the one we have.

**John:** Success is already not toast-only. Do not add banners. Published badge plus Overview status is truthful.

**Sally:** Compact, jump, revert, name the Preview. Stop.

**Resolved:** Implement those four Form-side deltas. Protect Website 42.1, Form 42.2/42.3, #388. Epic 43 not started.
