# PashuFeed Pro

Cattle feed shop and farm management platform for dairy farmers and shop owners.
Covers the storefront, POS billing, inventory, the farmer credit ledger (Khata),
ration guidance, and an AI nutrition advisor.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 6 |
| Styling | Tailwind CSS 4 (`@tailwindcss/vite`, no PostCSS config) |
| Icons | lucide-react |
| API | Express 4, run with `tsx` |
| AI | Google Gemini via `@google/genai` |

## Requirements

- Node.js 20 or newer
- npm

## Setup

```bash
npm install
cp .env.example .env    # then add your GEMINI_API_KEY
```

On Windows PowerShell: `Copy-Item .env.example .env`

## Running

```bash
npm run dev
```

This starts both processes:

- Vite dev server on <http://localhost:3000> (opens in your browser)
- Express API on <http://localhost:3001>

To run them separately:

```bash
npm run server   # API only
vite             # web only
```

The Vite dev server proxies `/api` to the API port, so the browser only ever
talks to port 3000.

### Without an API key

The server still boots. `POST /api/chat` returns `503 AI_DISABLED` and the chat
widget falls back to canned answers, labelled **Demo Mode** in the UI so it is
never mistaken for a live model response.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | yes, for live AI | - | Gemini credential, kept server-side only |
| `GEMINI_MODEL` | no | `gemini-2.5-flash` | Model for chat replies |
| `PORT` | no | `3001` | API port |

## Other commands

```bash
npm run lint     # tsc --noEmit
npm run build    # production bundle to dist/
npm run preview  # serve the production bundle
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness plus whether AI is enabled |
| `POST` | `/api/chat` | Chat reply; returns `{ text, actionBtn? }` |

`POST /api/chat` accepts `{ message, history, products, khataSummary }`. The
product catalogue and Khata summary are passed to the model so replies reference
real inventory and real balances. `actionBtn.view` is validated against a
whitelist on the server before it reaches the UI.

The API key is never sent to the browser.

## Project layout

```
.
├── server/
│   └── index.ts              Express API and Gemini integration
├── src/
│   ├── App.tsx               View router
│   ├── main.tsx
│   ├── index.css             Tailwind entry plus keyframes
│   ├── context/AppContext.tsx  Shared app state
│   ├── data/mockData.ts      Seed catalogue, orders, ledger
│   ├── types/index.ts
│   └── components/
│       ├── landing/          Hero, categories, featured, services, testimonials,
│       │                     ScrollAnimationBackground (scroll-scrubbed video)
│       ├── shop/             Listing, detail, cart, checkout, order tracking
│       ├── admin/            Overview, analytics, inventory, POS, Khata, CRM,
│       │                     suppliers, deliveries, offers, reports, settings
│       ├── customer/         Customer dashboard
│       ├── nutrition/        SmartRationQuiz
│       ├── subscriptions/    SubscriptionManager
│       ├── chat/             AIChatbotWidget
│       ├── common/           RatingStars, ToastContainer
│       └── layout/           Header, Footer
├── index.html
├── vite.config.ts
└── tsconfig.json
```

## Media assets

Background video clips load from public Mixkit CDN URLs. Each video list starts
with an optional local path that is skipped automatically when the file is
absent, so you can drop in your own footage without touching the code:

- `public/videos/cow_eating.mp4` - hero background
- `public/videos/cattle_feed_scroll.mp4` - scroll-scrubbed background

If every video source fails, the background falls back to a canvas animation.

Product and testimonial imagery loads from Unsplash CDN URLs defined in
`src/data/mockData.ts`.
