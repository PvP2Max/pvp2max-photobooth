# Photobooth

Front-desk and photographer workflow for capturing shots, removing backgrounds via the bgremover API, previewing curated backgrounds, and emailing the composed images. BoothOS now scopes data by business + event with per-event access keys. Canonical documentation and changelog live in `../docs/photobooth`.

## Quick start

- Copy `.env.example` to `.env` and update SMTP settings if you want live delivery. The provided `BGREMOVER_SERVICE_TOKEN` matches the bgremover project.
- For Brevo: `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, set `SMTP_USER` to your Brevo login and `SMTP_PASSWORD` to the SMTP key; `EMAIL_FROM` must be a verified sender.
- Install deps with `bun install`.
- Run quality gate: `bun run lint`.
- Build for production: `bun run build`.

## Docker

The included `Dockerfile` uses Bun and Next.js standalone output. A `docker-compose.yml` is provided with the required `apps-net` network for the Cloudflare tunnel. Persisted uploads/outbox live in `./storage` (mounted into the container).

## Backgrounds
- No built-in backgrounds are shipped. Use the Backgrounds page to upload your own.
- Recommended assets: PNG/WebP, 16:9, 2560x1440 (or 3200x1800) with a clear center band for subjects.
- API: `/api/backgrounds` (list/add/delete), `/api/backgrounds/files/:id` (serve custom assets).
