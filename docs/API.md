# BoothOS API Documentation

All API routes are prefixed with `/api/v1/`.

## Authentication

BoothOS uses Logto for authentication. Protected routes require a valid session cookie.

### Auth Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/auth/login` | Redirect to Logto login |
| GET | `/auth/callback` | Handle OAuth callback |
| GET | `/auth/logout` | Clear session and logout |
| GET | `/api/v1/auth/me` | Get current user |
| PATCH | `/api/v1/auth/me` | Update current user |

---

## Businesses

### List Businesses
```
GET /api/v1/businesses
```
Returns all businesses owned by the current user.

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "My Business",
        "slug": "my-business"
      }
    ]
  }
}
```

### Create Business
```
POST /api/v1/businesses
```
**Body:**
```json
{
  "name": "My Business"
}
```

### Get Business
```
GET /api/v1/businesses/:slug
```

### Update Business
```
PATCH /api/v1/businesses/:slug
```
**Body:**
```json
{
  "name": "Updated Name"
}
```

### Delete Business
```
DELETE /api/v1/businesses/:slug
```

---

## Events

### List Events
```
GET /api/v1/events?businessId=uuid
```
Returns paginated events for the specified business.

**Query Parameters:**
- `businessId` - Filter by business (optional)
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 10,
    "page": 1,
    "pageSize": 20,
    "hasMore": false
  }
}
```

### Create Event
```
POST /api/v1/events
```
**Body:**
```json
{
  "businessId": "uuid",
  "name": "My Event",
  "slug": "my-event",
  "plan": "FREE",
  "eventDate": "2025-01-15"
}
```

**Plans:** `FREE`, `PRO`, `CORPORATE`

### Get Event
```
GET /api/v1/events/:id
```

### Update Event
```
PATCH /api/v1/events/:id
```
**Body:**
```json
{
  "name": "Updated Name",
  "status": "LIVE",
  "mode": "PHOTOGRAPHER"
}
```

**Statuses:** `DRAFT`, `LIVE`, `CLOSED`
**Modes:** `SELF_SERVICE`, `PHOTOGRAPHER`

### Delete Event
```
DELETE /api/v1/events/:id
```

### Get Event QR Code
```
GET /api/v1/events/:id/qr
```
Returns a PNG QR code image for the event's booth URL.

---

## Sessions

### List Sessions
```
GET /api/v1/events/:id/sessions
```
Returns paginated guest sessions for the event.

---

## Photos

### List Photos
```
GET /api/v1/events/:id/photos?sessionId=uuid
```
Returns paginated photos for the event, optionally filtered by session.

### Upload Photos
```
POST /api/v1/events/:id/photos
```
**Body:** `multipart/form-data`
- `sessionId` - Guest session ID
- `photos` - File(s) to upload

**Response:**
```json
{
  "success": true,
  "data": {
    "uploaded": 3,
    "failed": 0,
    "results": [
      { "id": "uuid", "originalName": "photo.jpg", "success": true }
    ]
  }
}
```

### Get Photo
```
GET /api/v1/photos/:id
```

### Delete Photo
```
DELETE /api/v1/photos/:id
```

---

## Backgrounds

### List Backgrounds
```
GET /api/v1/events/:id/backgrounds?all=true
```
Returns backgrounds for the event including defaults.

**Query Parameters:**
- `all` - Include disabled backgrounds (default: false)

### Upload Background
```
POST /api/v1/events/:id/backgrounds
```
**Body:** `multipart/form-data`
- `file` - Image file
- `name` - Background name
- `category` - `BACKGROUND` or `FRAME` (optional)

### Generate AI Background
```
POST /api/v1/events/:id/backgrounds/generate
```
**Body:**
```json
{
  "prompt": "A magical forest at twilight",
  "style": "photographic",
  "name": "Forest Scene"
}
```

**Styles:** `photographic`, `digital-art`, `fantasy-art`, `cinematic`, `anime`, `neon-punk`, `3d-model`, `pixel-art`

### Get AI Generation Info
```
GET /api/v1/events/:id/backgrounds/generate
```
Returns available credits, styles, and prompt suggestions.

### Update Background
```
PATCH /api/v1/backgrounds/:id
```
**Body:**
```json
{
  "name": "New Name",
  "isEnabled": false
}
```

### Delete Background
```
DELETE /api/v1/backgrounds/:id
```

---

## Delivery

### Deliver Photos
```
POST /api/v1/events/:id/deliver
```
Composes selected photos with backgrounds and sends via email.

**Body:**
```json
{
  "email": "guest@example.com",
  "sessionId": "uuid",
  "selections": [
    {
      "photoId": "uuid",
      "backgroundId": "uuid",
      "transform": {
        "scale": 1.0,
        "offsetX": 0,
        "offsetY": 0
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "productionId": "uuid",
    "downloadToken": "token",
    "photoCount": 3,
    "email": "guest@example.com"
  }
}
```

### Download Photos
```
GET /api/v1/productions/:token/download
```
Public endpoint (no auth required). Downloads photos as a ZIP file or single image.

---

## Public Endpoints (No Auth)

### Get Event Info
```
GET /api/v1/public/events/:slug
```
Returns public event information and available backgrounds.

### Guest Check-in
```
POST /api/v1/public/events/:slug
```
**Body:**
```json
{
  "email": "guest@example.com",
  "name": "Guest Name"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "eventId": "uuid",
    "eventName": "My Event",
    "mode": "SELF_SERVICE"
  }
}
```

### List Sessions (Photographer Mode)
```
GET /api/v1/public/events/:slug/sessions?email=guest@example.com
```

### Get Session Photos
```
GET /api/v1/public/sessions/:id/photos
```

---

## Billing

### Create Checkout Session
```
POST /api/v1/billing/checkout
```
**Body:**
```json
{
  "businessId": "uuid",
  "eventName": "My Event",
  "eventSlug": "my-event",
  "plan": "PRO",
  "eventDate": "2025-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://checkout.stripe.com/..."
  }
}
```

### Webhook
```
POST /api/v1/billing/webhook
```
Stripe webhook endpoint. Automatically creates events on successful payment.

---

## Error Responses

All error responses follow this format:
```json
{
  "success": false,
  "error": "Error message"
}
```

Common status codes:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not logged in)
- `403` - Forbidden (no access)
- `404` - Not Found
- `500` - Internal Server Error
