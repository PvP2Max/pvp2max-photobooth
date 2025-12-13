# Photobooth

Front-desk and photographer workflow for capturing shots, removing backgrounds via the MODNet bgremover API, previewing curated backgrounds, and emailing the composed images. Cutouts are stored in R2 by the MODNet service; BoothOS keeps only metadata (no local originals/cutouts), and final renders are zipped and uploaded to R2 with a single download link per send. BoothOS now scopes data by business + event with per-event access keys. Canonical documentation and changelog live in `../docs/photobooth`.

## Quick start

- Copy `.env.example` to `.env` and update SMTP settings if you want live delivery. `BGREMOVER_API_BASE` defaults to `https://modnet.boothos.com` and `BGREMOVER_SOURCE_BASE` should match the public BoothOS host so the MODNet service can fetch staged uploads. The provided `BGREMOVER_SERVICE_TOKEN` matches the bgremover project. Set `R2_*` to your Cloudflare R2 bucket/CDN (used for final renders + zipped downloads).
- For Brevo: `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, set `SMTP_USER` to your Brevo login and `SMTP_PASSWORD` to the SMTP key; `EMAIL_FROM` must be a verified sender.
- Stripe: set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and price IDs for event/photographer plans (`STRIPE_PRICE_EVENT_BASIC`, `STRIPE_PRICE_EVENT_UNLIMITED`, `STRIPE_PRICE_EVENT_AI`, `STRIPE_PRICE_PHOTOG_EVENT`, `STRIPE_PRICE_PHOTOG_MONTHLY`, optional `STRIPE_PRICE_AI_TOPUP`). Webhook endpoint: `/api/stripe/webhook`.
- Install deps with `bun install`.
- Run quality gate: `bun run lint`.
- Build for production: `bun run build`.
- Savings calculator: use the embedded calculator on `/savings` to compare rental pricing against BoothOS plans (client-only component).

## Docker

The included `Dockerfile` uses Bun and Next.js standalone output. A `docker-compose.yml` is provided with the required `apps-net` network for the Cloudflare tunnel. Persisted metadata/outbox live in `./storage` (mounted into the container); cutouts are stored in R2 by the MODNet service and final renders/zips are uploaded to R2.

## Backgrounds
- No built-in backgrounds are shipped. Use the Backgrounds page to upload your own.
- Recommended assets: PNG/WebP, 16:9, 2560x1440 (or 3200x1800) with a clear center band for subjects.
- API: `/api/backgrounds` (list/add/delete), `/api/backgrounds/files/:id` (serve custom assets).
