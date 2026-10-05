# Traceability

| Owner / SPEC | Story AC | Evidence |
| ------------ | -------- | -------- |
| Responsive public desktop/mobile | AC1 | `registration-responsive.spec.ts` 320/360/375/412/768/1366/1440; screenshots `public-*.png` |
| Embed container | AC2 | iframe 320 after allow-list; `embed-320.png` |
| Preview parity | AC3 | `@container` preview chrome; `@min-[640px]`/`@min-[1024px]`; poster 480; 36.6 e2e |
| Basic absence | AC4 | Form Studio e2e + source contract; `form-studio-basic-build.png` |
| Core/Pro optional | AC5 | Form Studio e2e Core + Pro; `form-studio-core-build.png` |
| API Basic ignore | AC6 | `PublisherWebsiteLinkPlanIntegrationTests` 200 + null |
| API Core/Pro persist | AC7 | same integration theory Core/Pro false |
| Downgrade | AC8 | integration downgrade save + public GET 200; public plan gate unit |
| Upgrade | AC9 | integration Basic→Core enables flag; schema fields intact |
| Tenancy | AC10 | `publisher-website-url.test.ts` harbourline origin |
| Regression / Basic register | AC11 | public e2e + confirmation 375; Basic Form Studio still builds forms |
