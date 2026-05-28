# Cloudflare + GitHub setup

## 1. GitHub

```powershell
git init
git add .
git commit -m "Initial Hair AI Try-On MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USER/hair-ai-tryon.git
git push -u origin main
```

## 2. Cloudflare R2

Create bucket:

```powershell
npx wrangler r2 bucket create hair-tryon-images
```

## 3. Cloudflare D1

```powershell
npx wrangler d1 create hair-tryon-db
```

Put returned DB id into `apps/worker-api/wrangler.toml`.

Run schema:

```powershell
npx wrangler d1 execute hair-tryon-db --file=./apps/worker-api/schema.sql --remote
```

## 4. Cloudflare Queue

```powershell
npx wrangler queues create hair-generation-jobs
```

## 5. Worker API

```powershell
cd apps/worker-api
npx wrangler secret put AI_API_KEY
npx wrangler deploy
```

## 6. Cloudflare Pages

Cloudflare dashboard → Workers & Pages → Create → Pages → Connect GitHub.

Build settings:

```text
Root directory: apps/web
Build command: npm install && npm run build
Output directory: dist
```

Environment variable:

```text
VITE_API_BASE_URL=https://YOUR_WORKER.YOUR_SUBDOMAIN.workers.dev
```
