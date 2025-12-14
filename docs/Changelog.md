# Photobooth Changelog

## 2025-12-14
- Moved businesses/events persistence to Firestore (seeded default also synced). Event CRUD now reads/writes through Firestore and `/api/events` returns business info.
- Added owner-only role assignment endpoint `/api/events/roles` that resolves emails to Firebase UIDs and stores photographer/review roles on events.
- Dashboard/API calls now send business slugs; seed owner is allowed for seeded data. Mobile apps can consume Firestore-backed events directly.

## 2025-12-13
- Rebuilt the self-serve booth page with a full-screen, tap-to-start flow: countdown capture, review/retake, MODNet processing, background picker, and single email delivery (R2-hosted download link). No nav bar is shown while running the booth.
- Booth background picker now respects the event’s allowed backgrounds and selection cap; single-background events auto-select the only option.
- Fixed booth event links to render full URLs on the event cards/booth screen and removed the dashboard “Front desk” button from event cards.
- Added clearer login gating for booth sessions (business/event params stay attached) and improved cutout error handling when the MODNet service fails.
- Added “BoothOS Mobile App API Usage” doc outlining Firebase Auth headers, roles (owner/photographer/review), and mobile endpoint usage for self-serve and photographer flows.

## 2025-12-12
- Swapped BoothOS background removal to the MODNet `bgremover` API (`modnet.boothos.com`) using signed, per-upload URLs served from the new `/api/bgremover/source/[file]` endpoint (`BGREMOVER_SOURCE_BASE` + service token).
- Updated `.env.example` and documentation to call out the MODNet host, staging base, and service token requirements.
- Removed local photo storage; BoothOS now keeps only metadata and reuses the MODNet R2 cutout URLs when serving media or composing deliveries.
- Final renders now upload to R2 and are bundled into a single zip with one download link per delivery; production downloads and resend flow now read from R2 instead of local disk. Added R2 env vars to `.env.example`.
- Sidebar “Billing” now opens the Stripe customer-portal login link in a new tab; direct customer portal sessions would require storing Stripe customer ids and creating portal links server-side.
- Dashboard event cards now show full URLs with copy/QR for booth/check-in/photographer/front desk; removed the redundant top-level front-desk button.
