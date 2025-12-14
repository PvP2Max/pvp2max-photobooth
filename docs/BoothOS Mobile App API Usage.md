# BoothOS Mobile App API Usage

This doc explains how the iOS apps (self-serve booth and photographer tools) should authenticate and call the BoothOS APIs once Firebase Auth is enabled.

## Auth (Firebase)
- Sign users in with Firebase Auth (email/password or SSO). The app obtains a Firebase **ID token**.
- Send the token on every request: `Authorization: Bearer <FIREBASE_ID_TOKEN>`.
- The server will verify the token against your Firebase project (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`). No event keys are required for app traffic.

### Roles
- Each event has an owner (the account that created it).
- Optional per-event authorized users:
  - `photographer`: can access photographer upload endpoints and view/upload photos for that event.
  - `review`: can access the review (front-desk) endpoints to list/select/send photos for that event.
- Owners always have all roles. Self-serve events typically skip role assignments; photographer events may add `photographer` and `review` users by email (mapped to Firebase UID on the backend).

## Required env vars (server)
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```
- Place these in `.env` (quoted, with `\n` line breaks) and restart. The private key should come from a Firebase service account with permission to verify ID tokens.

## Firestore security rules (template)
Use a locked-down approach: only allow reads/writes for the authenticated user on their own profile, and reads for events they’re authorized on (owner or listed role). Example skeleton:
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isSignedIn() {
      return request.auth != null;
    }
    function isOwner(event) {
      return isSignedIn() && event.data.ownerId == request.auth.uid;
    }
    function hasRole(event, role) {
      return isSignedIn() && event.data.roles[role].hasAny([request.auth.uid]);
    }

    match /users/{uid} {
      allow read, write: if isSignedIn() && uid == request.auth.uid;
    }
    match /events/{eventId} {
      allow read: if isOwner(resource) || hasRole(resource, 'photographer') || hasRole(resource, 'review');
      allow write: if isOwner(resource);
    }
    match /events/{eventId}/photos/{photoId} {
      allow read, write: if isOwner(get(/databases/$(database)/documents/events/$(eventId)))
        || hasRole(get(/databases/$(database)/documents/events/$(eventId)), 'photographer')
        || hasRole(get(/databases/$(database)/documents/events/$(eventId)), 'review');
    }
  }
}
```
Adjust to match your Firestore collection layout once defined.

## Core API calls (mobile)
All requests include: `Authorization: Bearer <id_token>`, plus JSON unless noted.

### List events (owner or authorized)
`GET /api/events?business=<business-slug>`
- Returns Firestore-backed events for the business that your Firebase ID token is authorized for (owner or assigned role).

### Create event (owner)
`POST /api/events?business=<business-slug>`
```json
{
  "name": "Test Event",
  "mode": "self-serve" | "photographer",
  "plan": "event-basic" | "event-unlimited" | "event-ai" | "photographer",
  "eventDate": "2025-12-20",
  "allowedSelections": 3
}
```
- For iOS creation, deep-link to web checkout for paid plans; after payment, poll/list events.

### Assign roles (owner)
`POST /api/events/roles?business=<business-slug>`
```json
{
  "eventSlug": "test-event",
  "photographerEmails": ["photographer@example.com"],
  "reviewEmails": ["review@example.com"]
}
```
- Backend resolves emails to Firebase UIDs and stores them on the event (Firestore).

### Upload photo (photographer role or owner)
`POST /api/photos` (multipart)
- `file`: image
- `email`: guest email
- `removeBackground`: `true`
- Returns `photos: [{ id, cutoutUrl, previewUrl }]`.

### List photos by guest (review role or owner)
`GET /api/photos?email=<guest@example.com>`
- Returns photos for that guest under the current event.

### Backgrounds (owner or photographer)
`GET /api/backgrounds` — list allowed backgrounds for the event.

### Send email (review role or owner)
`POST /api/email`
```json
{
  "clientEmail": "guest@example.com",
  "selections": [
    { "photoId": "...", "backgroundId": "..." }
  ]
}
```
- Sends a single R2 download link with the composed images.

### Booth (self-serve mode)
- App loads the web booth link or directly calls:
  - `POST /api/photos` with camera capture (removeBackground=true).
  - `GET /api/backgrounds` to present allowed backgrounds.
  - `POST /api/email` with the selected background(s) and the returned `photoId`.

## iOS flow summary
- Login: Firebase Auth → ID token.
- Fetch events: `GET /api/events`.
- Self-serve: capture → `/api/photos` → choose background(s) from `/api/backgrounds` → `/api/email`.
- Photographer: upload via `/api/photos`; review app lists via `/api/photos?email=...`; send via `/api/email`.
- Role restrictions enforced server-side via ID token + event role lookup; owner always allowed.
