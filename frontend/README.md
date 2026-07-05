# AI Support Agent — Frontend

The marketing landing page, rebuilt as a **Next.js 14 (App Router) + Tailwind CSS** app. Black background, glassmorphism panels, glowing "storm yellow" buttons, and scroll/hover animations via Framer Motion. It talks to the existing Express backend (`../server`) purely over HTTP — it doesn't need the backend's source at all, just a URL.

## Setup

```bash
npm install
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Point this at wherever the backend (`../server`) is running — locally that's `http://localhost:3000` by default.

## Run

```bash
npm run dev      # http://localhost:3001
```

```bash
npm run build
npm start        # production server on http://localhost:3001
```

The dev/start scripts use port **3001** on purpose, since the backend defaults to port 3000 — run both at once without a clash.

## How it talks to the backend

Two things reach across to the Express server, both already CORS-enabled there:

1. **`GET /api/chat/demo-key`** — checked on page load to see if a live demo bot is seeded (`npm run seed-demo` in the backend). If active, the real `/widget/embed.js` script is injected, so the chat bubble on the page is the actual product, not a mockup.
2. **`/admin`** — the "Open admin dashboard" buttons link straight to the backend's admin dashboard.

Both use `NEXT_PUBLIC_API_BASE_URL` from `.env.local` — see `lib/api.js`.

## Structure

```
app/
  layout.js        fonts (Fraunces / Inter / IBM Plex Mono), global background
  page.js           assembles the sections
  globals.css       Tailwind layers + glass/storm-button utility classes
components/
  StormBackground.jsx   fixed ambient glow-orbs + grain + lightning flicker
  DemoProvider.jsx      loads the live widget, exposes open/state via context
  Button.jsx             storm (glow) / glass / ghost button variants
  Topbar.jsx, Hero.jsx, Features.jsx, HowItWorks.jsx, LiveDemo.jsx, Footer.jsx
  Reveal.jsx             scroll-triggered fade-up wrapper (Framer Motion)
```

## Customizing the look

Colors, glow intensity, and animation timing are all tokens in `tailwind.config.js` (`storm.*` palette, `boxShadow.glow-*`, `keyframes`) and the `.glass` / `.btn-storm` / `.btn-glass` classes in `app/globals.css` — change the values there rather than hunting through components.

## Deploying

Any Node host that runs Next.js (Vercel, Render, a VPS with `npm run build && npm start`, etc.) works. Set `NEXT_PUBLIC_API_BASE_URL` to your deployed backend's public URL, and set `FRONTEND_URL` in the **backend's** `.env` to this app's public URL so `/` on the backend redirects here correctly.
