## Design tokens

Brand colors and typography are defined in `styles/brand-tokens.css` (sourced from `_bmad-output/planning-artifacts/ux-designs/ux-lead-generation-crm-2026-06-14/DESIGN.md`).

- Use semantic Tailwind classes (`bg-primary`, `bg-status-new`, `text-text-warm`, etc.)
- Do not hard-code hex values in components — CSS variables only
- Dark mode tokens are in `.dark` (see Theme system below)

## Theme system

- **next-themes** with `defaultTheme="system"`, class-based dark mode on `<html>`
- Blocking inline script in `app/layout.tsx` `<head>` prevents flash of wrong theme
- Preference stored in `localStorage` key `theme` (`light` | `dark` | `system`)
- Full ThemeToggle UI in `components/theme/theme-toggle.tsx` (admin top bar + public footer via layout shells)
- Public routes use `PublicFormLayout` — see `/register/[slug]`

## Authentication

- Operator login at `/login` — posts to `POST /api/v1/auth/login`
- JWT access + refresh tokens stored in `localStorage` key `auth_session`
- Admin routes under `app/(admin)/` redirect to `/login` when unauthenticated
- Use `useAuth().authFetch()` for authenticated API calls; expired sessions redirect to login with toast
- Dev operator: `operator@leadgenerationcrm.local` / `ChangeMe123!`
- Settings → Appearance saves to operator profile via `PATCH /api/v1/admin/me/appearance`; `ThemePreferenceSync` applies profile theme after login


## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
