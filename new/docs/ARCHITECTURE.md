# BoothOS Architecture

## Overview

BoothOS is a photobooth SaaS platform built with Next.js 16, designed for event photo capture, background compositing, and instant email delivery.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 16 (App Router) + Bun |
| Database | PostgreSQL + Prisma ORM |
| Authentication | Logto (self-hosted OAuth) |
| Payments | Stripe |
| Storage | Cloudflare R2 |
| Background Removal | MODNet (external service) |
| AI Backgrounds | Stability AI |
| Image Processing | Sharp |
| Email | Nodemailer |
| Deployment | Docker Compose |

---

## Directory Structure

```
/new
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Default backgrounds seeder
├── docker/
│   ├── docker-compose.yml # Services configuration
│   ├── Dockerfile         # App container
│   └── logto/             # Logto configuration
├── docs/
│   ├── API.md             # API documentation
│   ├── DEPLOYMENT.md      # Deployment guide
│   └── ARCHITECTURE.md    # This file
├── src/
│   ├── app/
│   │   ├── (marketing)/   # Public pages (landing, pricing)
│   │   ├── (dashboard)/   # Authenticated dashboard
│   │   ├── (booth)/       # Guest-facing booth pages
│   │   ├── api/v1/        # REST API routes
│   │   ├── auth/          # Auth pages (login, callback, logout)
│   │   └── download/      # Token-based download page
│   ├── components/
│   │   ├── ui/            # Base UI components
│   │   ├── dashboard/     # Dashboard-specific components
│   │   └── shared/        # Shared components
│   ├── lib/               # Core services
│   └── types/             # TypeScript types
└── public/
    └── assets/            # Static assets
```

---

## Data Model

### Core Entities

```
User
  └── Business (1:many)
        └── Event (1:many)
              ├── GuestSession (1:many)
              │     └── Photo (1:many)
              ├── Background (1:many)
              └── Production (1:many)
                    └── ProductionAttachment (1:many)
```

### Key Relationships

- **User → Business**: Owner relationship
- **Business → Event**: Events belong to a business
- **Event → GuestSession**: Each guest check-in creates a session
- **GuestSession → Photo**: Photos linked to a session
- **Event → Background**: Custom backgrounds per event (+ global defaults)
- **Event → Production**: Email deliveries with attachments

---

## Authentication Flow

```
┌─────────┐     ┌─────────┐     ┌─────────┐
│ Browser │────>│ /login  │────>│  Logto  │
└─────────┘     └─────────┘     └─────────┘
                                     │
                                     ▼
┌─────────┐     ┌─────────────┐     ┌─────────┐
│ Browser │<────│ /callback   │<────│  Logto  │
└─────────┘     └─────────────┘     └─────────┘
                     │
                     ▼ (creates session cookie)
              ┌─────────────┐
              │  Dashboard  │
              └─────────────┘
```

1. User clicks "Sign In"
2. Redirect to Logto login page
3. User authenticates with email/password or social login
4. Logto redirects back with authorization code
5. Backend exchanges code for tokens
6. Session cookie created with encrypted user data
7. User redirected to dashboard

---

## Photo Processing Pipeline

```
┌─────────┐     ┌─────────────┐     ┌─────────┐
│ Upload  │────>│  Store R2   │────>│ MODNet  │
└─────────┘     │  (original) │     │(cutout) │
                └─────────────┘     └────┬────┘
                                         │
                                         ▼
                                   ┌─────────┐
                                   │ Store R2│
                                   │(cutout) │
                                   └─────────┘
```

**Delivery Pipeline:**

```
┌──────────────┐     ┌─────────────┐     ┌──────────┐
│ Select Photos│────>│  Compose    │────>│ Watermark│
│ + Background │     │   (Sharp)   │     │(if FREE) │
└──────────────┘     └─────────────┘     └────┬─────┘
                                              │
                                              ▼
┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Send Email  │<────│ Production  │<────│ Store R2 │
│              │     │   Record    │     │(composite)│
└──────────────┘     └─────────────┘     └──────────┘
```

---

## Event Modes

### Self-Service Mode

1. Guest scans QR code
2. Guest checks in with email
3. Guest takes photos via webcam
4. Guest selects photos and background
5. Photos delivered to email

### Photographer Mode (Corporate only)

1. Photographer opens photographer page
2. Guest checks in at kiosk
3. Photographer takes photos for guest
4. Guest opens review page (separate device)
5. Guest finds session by email
6. Guest selects favorites and background
7. Photos delivered to email

---

## Pricing Tiers

| Tier | Price | Photos | BG Removal | AI BGs | Modes |
|------|-------|--------|------------|--------|-------|
| Free | $0 | 25 | No | 0 | Self-service |
| Pro | $30 | 300 | Yes | 5 | Self-service |
| Corporate | $100 | 1000 | Yes | 10 | Both |

**Free tier photos include a watermark badge.**

---

## API Design

### Route Groups

- `/api/v1/auth/*` - Authentication
- `/api/v1/businesses/*` - Business CRUD
- `/api/v1/events/*` - Event CRUD + nested resources
- `/api/v1/photos/*` - Individual photo operations
- `/api/v1/backgrounds/*` - Individual background operations
- `/api/v1/billing/*` - Stripe integration
- `/api/v1/public/*` - Unauthenticated endpoints
- `/api/v1/productions/*` - Download tokens

### Response Format

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

**Paginated:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

---

## Security

### Authentication

- Session-based auth with encrypted cookies
- Logto handles password hashing, MFA, etc.
- CSRF protection via SameSite cookies

### Authorization

- Event access validated via `validateEventAccess()`
- Owner vs collaborator vs photographer roles
- Public endpoints don't require auth

### Data Protection

- No sensitive data in localStorage
- R2 presigned URLs for private files
- Download tokens expire after 7 days
- Email validation on check-in

---

## External Services

### Cloudflare R2

Used for all file storage:
- Original photos
- Cutout photos (background removed)
- Composite photos (final renders)
- Custom backgrounds
- AI-generated backgrounds

### MODNet Service

Self-hosted background removal service:
- Receives original image
- Returns PNG with transparent background
- Quality modes: fast, standard, high

### Stability AI

AI background generation:
- Text-to-image generation
- Multiple style presets
- 1920x1080 output resolution

### Stripe

Payment processing:
- Checkout sessions for Pro/Corporate events
- Webhook for payment confirmation
- Automatic event creation on success

---

## Performance Considerations

### Image Processing

- Sharp for high-performance compositing
- Async background removal (doesn't block upload)
- R2 for CDN-backed delivery

### Database

- Prisma query optimization
- Indexes on frequently queried fields
- Pagination for large result sets

### Caching

- Redis available for session caching
- Static page generation where possible
- CDN caching for public assets

---

## Development

### Local Setup

```bash
# Install dependencies
bun install

# Start database
docker compose up -d postgres

# Run migrations
bunx prisma migrate dev

# Start dev server
bun run dev
```

### Testing

```bash
# Type check
bun run lint

# Build
bun run build
```

---

## Future Considerations

- Mobile app integration (API-first design ready)
- Real-time updates with WebSockets
- Advanced analytics dashboard
- Multi-language support
- Custom branding per event
