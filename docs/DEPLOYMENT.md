# BoothOS Deployment Guide

This guide covers deploying BoothOS using Docker Compose with PostgreSQL, Logto, and Redis.

## Prerequisites

- Docker and Docker Compose installed
- Domain configured with DNS
- Cloudflare account (for R2 storage and tunnel)
- Stripe account with API keys
- Stability AI API key (for AI backgrounds)
- SMTP credentials (for email delivery)

## Quick Start

### 1. Clone and Configure

```bash
git clone git@github.com:pvp2max/pvp2max-photobooth.git
cd pvp2max-photobooth/new

# Copy environment template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env` with your credentials:

```env
# Database
DATABASE_URL=postgresql://boothos:boothos@postgres:5432/boothos

# Logto Auth
LOGTO_ENDPOINT=https://auth.yourdomain.com
LOGTO_APP_ID=your-app-id
LOGTO_APP_SECRET=your-app-secret
LOGTO_COOKIE_SECRET=generate-32-char-random-string

# Cloudflare R2
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=boothos
R2_PUBLIC_BASE_URL=https://pub-xxx.r2.dev

# Background Removal (MODNet service)
BGREMOVER_API_BASE=https://modnet.yourdomain.com
BGREMOVER_SERVICE_TOKEN=your-service-token

# AI Backgrounds
STABILITY_API_KEY=sk-xxx

# Stripe Payments
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_PRO=price_xxx
STRIPE_PRICE_CORPORATE=price_xxx

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-user
SMTP_PASSWORD=your-password
EMAIL_FROM=photos@yourdomain.com

# App URL
NEXT_PUBLIC_APP_URL=https://boothos.yourdomain.com
```

### 3. Start Services

```bash
cd docker
docker compose up -d
```

This starts:
- **boothos** - Main Next.js app (port 3000)
- **postgres** - PostgreSQL database
- **logto** - Authentication service (ports 3001, 3002)
- **redis** - Caching (optional)

### 4. Initialize Database

```bash
# Run migrations
docker compose exec boothos bunx prisma migrate deploy

# Seed default backgrounds
docker compose exec boothos bun run db:seed
```

### 5. Configure Logto

1. Access Logto admin: `http://localhost:3001`
2. Create a new application (Traditional Web)
3. Set redirect URIs:
   - `https://boothos.yourdomain.com/auth/callback`
4. Copy App ID and Secret to `.env`
5. Restart the boothos container

### 6. Configure Stripe

1. Create products in Stripe Dashboard:
   - Pro Event ($30)
   - Corporate Event ($100)
2. Copy price IDs to `.env`
3. Set up webhook:
   - URL: `https://boothos.yourdomain.com/api/v1/billing/webhook`
   - Events: `checkout.session.completed`
4. Copy webhook secret to `.env`

---

## Production Configuration

### Using Cloudflare Tunnel

The docker-compose.yml is configured to use an external `apps-net` network for Cloudflare tunnel:

```yaml
networks:
  boothos-net:
    driver: bridge
  apps-net:
    external: true
```

Ensure your Cloudflare tunnel container is on the `apps-net` network and route traffic to `boothos:3000`.

### Nginx Reverse Proxy (Alternative)

If using nginx instead of Cloudflare tunnel:

```nginx
server {
    listen 443 ssl http2;
    server_name boothos.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### SSL Certificates

For production, use Let's Encrypt or Cloudflare for SSL certificates.

---

## Updating

```bash
cd pvp2max-photobooth/new

# Pull latest changes
git pull origin main

# Rebuild and restart
cd docker
docker compose build boothos
docker compose up -d boothos

# Run any new migrations
docker compose exec boothos bunx prisma migrate deploy
```

---

## Monitoring

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f boothos
```

### Database Backup

```bash
docker compose exec postgres pg_dump -U boothos boothos > backup.sql
```

### Restore Database

```bash
docker compose exec -T postgres psql -U boothos boothos < backup.sql
```

---

## Troubleshooting

### Database Connection Issues

```bash
# Check postgres is running
docker compose ps postgres

# View postgres logs
docker compose logs postgres

# Test connection
docker compose exec postgres psql -U boothos -c "SELECT 1"
```

### Auth Issues

1. Verify Logto is accessible: `curl http://localhost:3002/.well-known/openid-configuration`
2. Check redirect URIs match exactly
3. Verify LOGTO_COOKIE_SECRET is set

### Storage Issues

1. Test R2 credentials with AWS CLI
2. Verify bucket permissions (public read)
3. Check R2_PUBLIC_BASE_URL is accessible

### Email Delivery Issues

1. Test SMTP credentials with `swaks` or similar tool
2. Check spam folders
3. Verify EMAIL_FROM matches your domain's SPF/DKIM

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| LOGTO_ENDPOINT | Yes | Logto auth server URL |
| LOGTO_APP_ID | Yes | Logto application ID |
| LOGTO_APP_SECRET | Yes | Logto application secret |
| LOGTO_COOKIE_SECRET | Yes | 32-char random string for session encryption |
| R2_ENDPOINT | Yes | Cloudflare R2 S3-compatible endpoint |
| R2_ACCESS_KEY_ID | Yes | R2 access key |
| R2_SECRET_ACCESS_KEY | Yes | R2 secret key |
| R2_BUCKET_NAME | Yes | R2 bucket name |
| R2_PUBLIC_BASE_URL | Yes | Public URL for R2 bucket |
| BGREMOVER_API_BASE | No | MODNet service URL |
| BGREMOVER_SERVICE_TOKEN | No | MODNet auth token |
| STABILITY_API_KEY | No | Stability AI API key |
| STRIPE_SECRET_KEY | Yes | Stripe secret key |
| STRIPE_WEBHOOK_SECRET | Yes | Stripe webhook signing secret |
| STRIPE_PRICE_PRO | Yes | Stripe price ID for Pro plan |
| STRIPE_PRICE_CORPORATE | Yes | Stripe price ID for Corporate plan |
| SMTP_HOST | Yes | SMTP server hostname |
| SMTP_PORT | Yes | SMTP port (usually 587) |
| SMTP_USER | Yes | SMTP username |
| SMTP_PASSWORD | Yes | SMTP password |
| EMAIL_FROM | Yes | From address for emails |
| NEXT_PUBLIC_APP_URL | Yes | Public URL of the application |
