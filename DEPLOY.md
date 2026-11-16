# Deployment Guide 🚀

GetShitDone deploys to **Vercel** as one project: the `public/` folder is served as static files and the Express API runs as a serverless function.

| Path | What serves it |
|------|----------------|
| `/`, `/dashboard`, `/contact` … | Static files from `public/` (`cleanUrls` drops the `.html`) |
| `/api/*` | `api/index.js` → the Express app in `server/app.js` |

## 1. Import the repo
1. In Vercel, **Add New → Project** and import this repository.
2. Framework preset: **Other**. Leave the build command empty. Output directory: `public` (already set in `vercel.json`).
3. Deploy. Every push to `main` creates a new production deployment.

## 2. (Optional) Connect a real database and email
Without these the live site runs in **demo mode**: the API answers `503` and the dashboard stores tasks in the browser's `localStorage`, so every feature still works.

Add these in **Project → Settings → Environment Variables**, then redeploy:

| Variable | Purpose |
|----------|---------|
| `MONGO_URI` | MongoDB Atlas connection string (allow access from `0.0.0.0/0` for serverless) |
| `GMAIL_USER`, `GMAIL_PASS`, `MAIL_RECIPIENT` | Contact form email via a Gmail App Password |

Check it worked: `https://<your-project>.vercel.app/api/health` returns `{"ok":true,"db":true}` once a task request has connected.

## Running locally
```bash
cp .env.example .env   # fill in MONGO_URI etc.
npm install
npm run dev            # http://localhost:3000
```
