# Photobooth

Front-desk and photographer workflow for capturing shots, removing backgrounds via the bgremover API, previewing curated backgrounds, and emailing the composed images. Canonical documentation and changelog live in `../docs/photobooth`.

## Quick start

- Copy `.env.example` to `.env` and update SMTP settings if you want live delivery. The provided `BGREMOVER_SERVICE_TOKEN` matches the bgremover project.
- For Brevo: `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, set `SMTP_USER` to your Brevo login and `SMTP_PASSWORD` to the SMTP key; `EMAIL_FROM` must be a verified sender.
- Install deps with `bun install`.
- Run quality gate: `bun run lint`.
- Build for production: `bun run build`.

## Docker

The included `Dockerfile` uses Bun and Next.js standalone output. A `docker-compose.yml` is provided with the required `apps-net` network for the Cloudflare tunnel. Persisted uploads/outbox live in `./storage` (mounted into the container).

## Background sets
- Christmas (12): Winter Lights, Candy Cane Stripes, Snow Globe, Pine Lanterns, Gingerbread Hall, Crimson Ornaments, Midnight Snowfall, Holly Bokeh, Cozy Fireplace, North Star, Frosted Mint, Gold Ribbon.
- Alaska (4): Aurora Ridge (AK), Glacier Bay (AK), Spruce Sunset (AK), Icefield Dawn (AK).
