# Hair AI Try-On MVP

Web MVP for AI hairstyle try-on: upload a face photo, generate hairstyle variants, swipe like/dislike, save favorites.

## Stack

- Frontend: React + Vite
- API: Cloudflare Workers
- Storage: Cloudflare R2
- Queue: Cloudflare Queues
- DB: Cloudflare D1
- AI provider: Replicate / Fal / RunPod placeholder

## Local start, PowerShell

```powershell
npm install
npm run dev:web
```

In another terminal:

```powershell
npm run dev:api
```

## Deploy idea

1. Push this repo to GitHub.
2. Connect `apps/web` to Cloudflare Pages.
3. Deploy `apps/worker-api` with Wrangler.
4. Add secrets: `AI_PROVIDER`, `AI_API_KEY`, `PUBLIC_R2_BASE_URL`.

See `docs/CLOUDFLARE_SETUP.md`.
