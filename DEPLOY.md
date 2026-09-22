# Deploying Q-FleetFlow (frontend + backend)

Two separate deployments: the FastAPI backend on Render (needs a persistent
process - Vercel's serverless functions can't run this reliably, see the
reasoning in chat), and this Next.js frontend on Vercel.

## 1. Backend -> Render

1. Push the `q-fleetflow` repo to GitHub (separate repo from this frontend).
2. Go to render.com, sign in with GitHub, "New +" -> "Blueprint", select the
   `q-fleetflow` repo. Render will read `render.yaml` automatically and
   configure the service.
3. Deploy. First build takes a few minutes (installing lightgbm, pymoo, etc).
4. Once live, copy the service URL (e.g. `https://q-fleetflow-api.onrender.com`).
5. Test it: `curl https://<your-url>.onrender.com/health` should return
   `{"status":"ok",...}`.

**Honest limitation**: Render's free tier spins the service down after 15
minutes of inactivity. The next request wakes it up but takes ~30-50s. Same
tradeoff as Streamlit Community Cloud's sleep behavior - fine for a PPT
link people click occasionally, not for a zero-latency live demo. If the
offline round needs guaranteed instant response, run the backend locally
during the actual demo instead (`uvicorn src.api.main:app`) and only use
the Render URL for the PPT/take-home link.

## 2. Frontend -> Vercel

1. Push this `q-fleetflow-web` folder to its own GitHub repo.
2. Go to vercel.com, sign in with GitHub, "Add New" -> "Project", import the
   repo. Vercel auto-detects Next.js - no config needed.
3. Before deploying, add an environment variable:
   `NEXT_PUBLIC_API_URL` = your Render backend URL from step 1.
4. Deploy. You'll get a `*.vercel.app` URL.

## 3. Verify end-to-end

Open the deployed frontend URL -> "Run optimizer" -> set small values first
(pop=10, gen=15) to confirm the round-trip works before trying the full
40x150 budget -> should land on the Pareto explorer with a working 3D plot.

## Local development (no deployment)

```bash
# terminal 1 - backend
cd q-fleetflow
uvicorn src.api.main:app --reload --port 8000

# terminal 2 - frontend
cd q-fleetflow-web
cp .env.example .env.local   # then edit if needed
npm run dev
```

Open http://localhost:3000
