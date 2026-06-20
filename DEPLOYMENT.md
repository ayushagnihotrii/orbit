# Deploying SafeSpace

Three pieces, two platforms: backend + ai-service + Postgres on Render
(via the `render.yaml` Blueprint), frontend on Vercel. Do them in this
order — each step needs a URL produced by the previous one.

## 1. Backend + ai-service + Postgres on Render

1. Create a free account at [render.com](https://render.com) and connect
   your GitHub account.
2. Dashboard → **New +** → **Blueprint** → pick the `orbit` repo. Render
   reads `render.yaml` at the repo root and shows a preview of 3 resources:
   `safespace-db` (Postgres), `safespace-ai-service`, `safespace-backend`.
3. Click **Apply**. Render provisions the database first, then builds both
   web services. The backend's build runs `prisma migrate deploy`
   automatically, so the schema is ready on first deploy.
4. **The ai-service deploys without the real ML model** (free tier doesn't
   have enough RAM for PyTorch + DistilBERT) — it falls back to the
   regex-adjacent heuristic keyword scorer, which is a real, already-tested
   code path, not a stub. The profanity filter layer is unaffected either
   way. See `render.yaml`'s comment for the tradeoff; revisit if you
   upgrade to a paid instance later.
5. Once both services show **Live**, copy their URLs from the Render
   dashboard (e.g. `https://safespace-ai-service.onrender.com` and
   `https://safespace-backend.onrender.com`).
6. Go to `safespace-backend` → **Environment** and fill in the two
   variables that were left blank (`sync: false` in the blueprint):
   - `AI_SERVICE_URL` → the ai-service URL from step 5
   - `FRONTEND_URL` → leave a placeholder for now (e.g. `http://localhost:3000`);
     you'll update this in step 3 below once Vercel gives you a real URL.
7. Save — Render redeploys the backend automatically with the new env vars.

Free-tier note: both services sleep after ~15 minutes of inactivity. The
first request after a sleep takes 30–60s to wake up — normal for a free
demo, not a bug.

## 2. Seed the deployed database

Render's free Postgres accepts external connections, so you can run the
existing seed script from your machine against it instead of writing a new
one:

```bash
cd backend
DATABASE_URL="<external connection string from Render's safespace-db page>" pnpm run seed
```

Use the **External Database URL** shown on the `safespace-db` page in
Render (not the internal one used by the backend service).

## 3. Frontend on Vercel

You already have a Vercel account, so this is the part you're doing
yourself:

```bash
cd frontend
vercel link        # creates/links a Vercel project for this directory
vercel env add NEXT_PUBLIC_API_URL production
# paste the safespace-backend URL from step 1.5, e.g. https://safespace-backend.onrender.com
vercel --prod
```

(Or do the equivalent through the Vercel dashboard: **Add New → Project →
Import** the `orbit` repo, set **Root Directory** to `frontend`, and add
the `NEXT_PUBLIC_API_URL` environment variable before deploying.)

Once deployed, copy the production URL Vercel gives you (e.g.
`https://orbit-yourname.vercel.app`).

## 4. Close the loop: update CORS

Go back to Render → `safespace-backend` → **Environment** → set
`FRONTEND_URL` to the real Vercel URL from step 3 (no trailing slash).
Save to trigger a redeploy. Without this step, the deployed frontend's
requests will be blocked by CORS.

## 5. Verify

Visit the Vercel URL, sign up a fresh test account (real signup flow, not
the seeded ones — those passwords are public in the README), and confirm
you can browse communities. Log in as `mod_taylor` (seeded, password
`Password123!`) to see the moderation queue.

## Updating the README

Once you have a working public URL, add it near the top of the root
`README.md`, e.g.:

```markdown
**Live demo:** https://orbit-yourname.vercel.app
```
