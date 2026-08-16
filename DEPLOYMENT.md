# Deploying Couple Memory Map (free tier)

Permanent hosting: **Vercel** (frontend) + **Render** (backend) + **Neon** (Postgres) + **Google Drive** (photos).
Follow these steps once; total time ~20 minutes.

## 1. Database — Neon (free, persistent)

1. Sign up at https://neon.tech and create a project.
2. Copy the connection string (Dashboard → Connection Details), it looks like:
   `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

## 2. Backend — Render (free)

1. Push this repo to GitHub (`git remote add origin … && git push -u origin main`).
2. Sign up at https://render.com → **New → Web Service** → connect the repo.
3. Settings (or just use the included `render.yaml` via Blueprint):
   - Root directory: `backend`
   - Build: `pip install -r requirements.txt`
   - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Plan: Free
4. Environment variables:
   - `DATABASE_URL` = the Neon connection string
   - `JWT_SECRET` = any long random string
   - `FRONTEND_URL` = your Vercel URL (set after step 3, e.g. `https://your-app.vercel.app`)
   - `PUBLIC_BASE_URL` = your Render URL (e.g. `https://couple-memory-map-api.onrender.com`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` = see step 4 (optional)
5. Deploy. Tables are created automatically on startup.

## 3. Frontend — Vercel (free)

1. Sign up at https://vercel.com → **Add New → Project** → import the GitHub repo.
2. Framework preset: Vite (auto-detected). No env vars needed.
3. In `vercel.json`, update the rewrite destination to your Render URL if it differs
   from `couple-memory-map-api.onrender.com`.
4. Deploy → you get `https://<your-name>.vercel.app`.

## 4. Google Drive photo storage (optional but recommended)

Photos otherwise live on the Render disk, which is wiped on every redeploy.

1. Go to https://console.cloud.google.com → create a project.
2. APIs & Services → Enable **Google Drive API**.
3. OAuth consent screen: External, add yourself as test user.
4. Credentials → Create OAuth client ID → Web application:
   - Authorized redirect URI: `https://<your-render-app>.onrender.com/api/drive/callback`
5. Copy Client ID/Secret into Render env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) and redeploy.
6. In the app: ⚙️ → **Connect Google Drive for photos** → consent. Both partners share the couple's Drive folder.

## Notes

- Render free tier sleeps after 15 min idle → first request takes ~50 s to wake. Data is safe (Neon + Drive).
- Local dev: `cd backend && venv\Scripts\python -m uvicorn app.main:app --reload` and `npm run dev` (uses SQLite + local `uploads/`).
