# FinPilot AI — Smart Financial Planning Platform

A premium, glassmorphism-styled personal finance dashboard built with React.
Tracks income, expenses, budgets, investments, goals, EMIs, subscriptions,
financial health score, retirement planning, and an AI financial advisor.

---

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev
```

The app opens automatically at **http://localhost:5173**

To build for production:
```bash
npm run build      # outputs to /dist
npm run preview    # preview the production build locally
```

---

## 📁 Project Structure

```
finpilot-ai/
├── index.html              # HTML entry point
├── package.json            # Dependencies & scripts
├── vite.config.js          # Vite build config
├── .gitignore
├── README.md                ← you are here
└── src/
    ├── main.jsx             # React root render
    └── FinPilotAI.jsx       # The entire app (single-file component)
```

The whole application lives in **`src/FinPilotAI.jsx`** — all views (Dashboard,
Income, Expenses, Budget, Investments, Goals, EMI, Subscriptions, Health Score,
Retirement Planner, FI Calculator, Reports, AI Advisor) are defined as
components inside that one file for easy portability. Feel free to split them
into separate files under `src/components/` as the app grows.

---

## 💾 Data Persistence

All income, expense, budget, investment, and goal data is stored in the
browser's **`localStorage`** under these keys:

| Key                | Contents          |
|---------------------|--------------------|
| `fp_incomes`        | Income entries     |
| `fp_expenses`        | Expense entries     |
| `fp_budgets`         | Budget categories   |
| `fp_investments`     | Investment holdings |
| `fp_goals`            | Savings goals       |

Data persists across page reloads and browser restarts, but is **local to
that browser** — it does not sync across devices. For multi-device sync,
you'd want to add a backend + database (see "Going Further" below).

To reset all data, open your browser console and run:
```js
localStorage.clear()
```

---

## 🤖 Connecting the AI Advisor (important!)

The **AI Financial Advisor** chat panel (in Dashboard and the AI Advisor tab)
expects a backend endpoint at **`/api/chat`**. It does **NOT** call Anthropic's
API directly from the browser — doing so would expose your API key publicly
and also get blocked by CORS.

You need to add a tiny backend. Two easy options:

### Option A — Vite dev proxy + a local Node/Express server

1. Create a minimal Express server (`server.js` in the project root):

```js
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.post("/api/chat", async (req, res) => {
  const { system, message } = req.body;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system,
      messages: [{ role: "user", content: message }],
    });
    res.json({ reply: response.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log("API server running on :3001"));
```

2. Install dependencies:
```bash
npm install express @anthropic-ai/sdk
```

3. Set your API key as an environment variable:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
node server.js
```

4. Add a proxy rule in `vite.config.js` so `/api/chat` forwards to your
   Express server during development:

```js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
```

### Option B — Serverless function (Vercel / Netlify)

Deploy a serverless function at `/api/chat.js` (Vercel) or
`/netlify/functions/chat.js` (Netlify) that does the same thing as the
Express handler above. Both platforms let you set `ANTHROPIC_API_KEY` as a
secret environment variable in their dashboard — never commit it to git.

### If you don't connect a backend

The app still works completely fine — every other feature (income, expenses,
budgets, investments, goals, EMI, reports, retirement planner, FI calculator)
is 100% functional without any backend. The AI Advisor will simply show a
friendly message asking you to finish this setup step.

---

## 🎨 Tech Stack

- **React 18** — function components + hooks (`useState`, `useEffect`, `useRef`)
- **Vite** — dev server & build tool
- **Inline styles** — no CSS framework dependency, fully self-contained
- **No external UI libraries** — all charts (bar, donut, sparkline, circular
  progress) are hand-built SVG components for zero extra dependencies

---

## 🛠️ Customization Tips

- **Colors** — edit the `COLORS` object at the top of `FinPilotAI.jsx`
- **Seed/dummy data** — edit `SEED_INCOME`, `SEED_EXPENSES`, `BUDGET_SEED`,
  `INV_SEED`, `GOALS_SEED` constants
- **Currency** — search for `₹` and `en-IN` to localize to another currency/locale
- **Add a real backend** — replace the `useLocalStorage` hook calls with API
  calls to your own REST/GraphQL backend once you're ready for multi-device
  sync and proper accounts

---

## 📦 Going Further (optional)

To turn this into a production multi-user SaaS, consider adding:
- **Authentication** (e.g. Auth0, Clerk, Firebase Auth, or your own JWT-based auth)
- **A real database** (PostgreSQL + Prisma, Supabase, or MongoDB) to replace
  `localStorage`
- **A backend API** (Node/Express, Next.js API routes, or similar) for CRUD
  operations and the AI Advisor proxy
- **PDF/Excel export** for the Reports section (libraries like `jspdf`,
  `xlsx`)
- **Push notifications** for budget overruns, warranty expiries, EMI due dates

---

Built with ❤️ — FinPilot AI
