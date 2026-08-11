# Playwright end-to-end tests

Smoke tests exercise the public marketing and auth surfaces through the same nginx front door operators use locally.

## Prerequisites

1. Start the Docker stack (see repo root `README.md`).
2. Install browser dependencies once:

```bash
cd web
npm install
npx playwright install chromium
```

## Run against the Docker stack

With nginx on port 8088 (default in `.env.local-docker.example`):

```bash
cd web
PUBLIC_BASE_URL=http://localhost:8088 npm run test:e2e
```

The tenant subdomain test uses `default.localhost:8088` and skips automatically when that host is unreachable (for example, if nginx is not running).

## Configuration

- `PUBLIC_BASE_URL` — base URL for tests (defaults to `http://localhost:8088`).
- `playwright.config.ts` reads the same variable for `use.baseURL`.
