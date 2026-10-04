# ❄️ Winter Arc Tracker

A 90-day habit tracker with a hand-written paper notebook aesthetic, analytics charts, and AI-generated coaching — built with React + Vite + Supabase + Recharts.

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd winter-arc-tracker
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the migration:
   ```
   supabase/migrations/001_initial_schema.sql
   ```
3. Copy your credentials from **Project Settings → API**

### 3. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🤖 AI Coach Setup (Gemini)

The AI coach uses Google Gemini, called **only from a Supabase Edge Function** — the API key never touches the browser.

### 1. Get a Gemini API Key

Visit [Google AI Studio](https://aistudio.google.com/app/apikey) → Create API key (free tier works)

### 2. Deploy the Edge Function

Install the Supabase CLI if you haven't:
```bash
npm install -g supabase
supabase login
```

Link your project:
```bash
supabase link --project-ref your-project-id
```

Set the secret:
```bash
supabase secrets set GEMINI_API_KEY=your-gemini-api-key
```

Deploy:
```bash
supabase functions deploy ai-coach
```

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User settings: start date, threshold, privacy mode |
| `habits` | Habit definitions (name, type, target, unit, position) |
| `logs` | Daily habit logs (status: done/missed, value for number habits) |
| `reviews` | AI Coach review history |

All tables have **Row Level Security** — users can only access their own data.

---

## 📱 PWA / Mobile

The app is installable as a PWA. On mobile:
- Open in Chrome/Safari → Add to Home Screen
- Works offline (cached assets via service worker)
- Optional daily reminders via Web Push Notifications

---

## 🚢 Deploy to Vercel

```bash
npm run build
vercel deploy
```

Set environment variables in Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## 📁 Project Structure

```
src/
├── components/        # Reusable UI: HabitRow, Heatmap, ProgressRing, etc.
├── context/           # AuthContext (Supabase session + profile)
├── hooks/             # useHabits, useAnalytics
├── lib/               # Supabase client, date utilities, default habits
├── pages/             # DailyPage, AnalyticsPage, CoachPage, SettingsPage
├── types/             # TypeScript interfaces
└── index.css          # Paper notebook design system

supabase/
├── functions/ai-coach/ # Edge Function → Gemini API
└── migrations/         # SQL schema
```

---

## 🎨 Design

Inspired by hand-written paper notebooks:
- **Cream background** (#f5f0e1) with SVG grain texture
- **Ruled notebook lines** via CSS repeating gradients
- **Red margin line** + spiral hole punches
- **Fonts**: Caveat, Patrick Hand, Special Elite (Google Fonts)
- **Animated SVG** tick and cross marks (stroke-dashoffset)
- **Sticky note** cards for AI reviews

---

## 🔑 Default Habits (16)

New users are seeded with: No porn, Drink 3L water, Sleep 8hrs, Protein, Read 10 pages, Cold shower, 10k steps, No sex, No sugar, No alcohol, No distractions, Wake 6 AM, Sleep 10 PM, Focus on yourself, No excuses, Meditate.

All fully editable, reorderable, and deletable.
