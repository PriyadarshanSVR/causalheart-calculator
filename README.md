# Heart Health Calculator

An interactive cardiovascular risk tool that estimates your 10-year heart risk and shows how specific lifestyle changes could lower it — with a personalised action plan and live risk trajectory charts.

---

## Prerequisites

Make sure you have these installed before you begin:

| Tool | Version | Download |
|------|---------|----------|
| **Node.js** | v18 or later (LTS recommended) | https://nodejs.org |
| **pnpm** | v8 or later | https://pnpm.io/installation |

> **Why pnpm and not npm?** This project uses `pnpm` to avoid a known Windows issue where `npm install` fails with a missing `@rollup/rollup-win32-x64-msvc` error.

### Install pnpm (one-time setup)

Open **PowerShell** or **Command Prompt** and run:

```powershell
npm install -g pnpm
```

Verify it worked:

```powershell
pnpm --version
```

---

## Running the App Locally

Follow these steps **every time** you want to view the app in your browser.

### Step 1 — Open a terminal in the project folder

Open **PowerShell**, **Command Prompt**, or **Windows Terminal**, then navigate to the project:

```powershell
cd "C:\Users\sange\Desktop\UCL\AIH MRES\Dissertation\Front End\causalheart-calculator"
```

### Step 2 — Install dependencies

You only need to do this **once** (or after pulling in new changes):

```powershell
pnpm install
```

### Step 3 — Start the development server

```powershell
pnpm run dev
```

You'll see output like this in the terminal:

```
  VITE v5.x.x  ready in ~300ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 4 — Open in your browser

Visit: **[http://localhost:5173](http://localhost:5173)**

The app opens on the Heart Health Calculator landing page.

### Step 5 — Stop the server when finished

Go back to the terminal window and press:

```
Ctrl + C
```

---

## Quick-Start Cheat Sheet (copy & paste)

```powershell
# 1. Navigate to the project folder
cd "C:\Users\sange\Desktop\UCL\AIH MRES\Dissertation\Front End\causalheart-calculator"

# 2. Install dependencies (first time only)
pnpm install

# 3. Start the app
pnpm run dev

# 4. Open your browser and go to:
#    http://localhost:5173
```

---

## App Flow

```
Landing Page
    ↓  Click "Let's check your heart health"
Questionnaire  (10 short steps)
    ↓  Click "Calculate My Risk"
Loading Screen  (~1.5 seconds)
    ↓
Results Page
    ├── Risk gauge         — your estimated 10-year heart risk %
    ├── Trajectory chart   — tap action cards to see risk lines update live
    └── Action plan cards  — personalised lifestyle interventions ranked by impact
    ↓  Click "New Calculation"
Questionnaire  (starts fresh from step 1)
```

---

## Project Structure

```
causalheart-calculator/
│
├── App.tsx                    # Root — controls view states (landing / input / calculating / results)
├── index.html                 # HTML entry point & Tailwind CDN
├── index.css                  # Global styles, scrollbar, step-slide animations
├── types.ts                   # TypeScript types: UserProfile, Intervention, RiskAnalysisResult
│
├── components/
│   ├── InputForm.tsx          # 10-step wizard questionnaire
│   ├── ScenarioExplorer.tsx   # Results page: gauge, multi-line chart, intervention cards
│   └── RiskGauge.tsx          # SVG semicircle gauge with colour zones
│
└── services/
    └── causalEngine.ts        # Risk model (logistic regression) + intervention effect estimates
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 |
| Language | TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS (CDN) |
| Charts | Recharts |
| Icons | Lucide React |
| Package manager | pnpm |

---

## Troubleshooting

**`pnpm` is not recognised**
→ Run `npm install -g pnpm` first, then close and reopen your terminal.

**Port 5173 is already in use**
→ Vite will automatically try the next port (5174, 5175 …). Check the terminal output for the actual URL.

**`node` is not recognised**
→ Node.js is not installed or not on your PATH. Install it from https://nodejs.org and restart your terminal.

**`pnpm install` fails with permission errors**
→ Right-click your terminal app and choose **"Run as administrator"**, then try again.

**My code changes aren't showing in the browser**
→ Vite uses Hot Module Replacement — most edits appear instantly. If something looks stuck, press `Ctrl + Shift + R` in the browser to force a full reload.
