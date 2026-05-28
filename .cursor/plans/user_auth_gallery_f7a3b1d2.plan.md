---
name: User Authentication, Unified RSVP & Media Gallery
overview: |
  Replace phone/Twilio auth with a seamless email-based user system where accounts are created during RSVP.
  Consolidate both RSVP forms into one component with guest/returning states. Add password-optional profile
  management, photo/video upload (Cloudinary), and a public gallery page. Includes a manual testing guide.
todos:
  - id: read-and-understand-plan
    content: Read the entire plan from top to bottom and confirm full understanding before any code changes are made
    status: completed
  - id: update-user-model
    content: Modify server/models/User.js — add email (unique), passwordHash, passwordResetToken, passwordResetExpires; make phone optional/remove
    status: completed
  - id: add-bcrypt-dependency
    content: Install bcrypt in server/package.json
    status: completed
  - id: rewrite-auth-routes
    content: Rewrite server/routes/auth.js — remove OTP, add register, login, set-password, lookup endpoints
    status: completed
  - id: update-auth-middleware
    content: Update server/middleware/auth.js JWT payload to include email instead of phone
    status: completed
  - id: add-password-email-template
    content: Add sendPasswordSetEmail method to server/services/emailService.js using existing Gmail API
    status: completed
  - id: create-media-model
    content: Create server/models/Media.js with userId, cloudinaryUrl, mediaType, thumbnailUrl, eventId, createdAt
    status: completed
  - id: create-media-routes
    content: Create server/routes/media.js with POST (auth) and GET (public) endpoints
    status: completed
  - id: mount-media-routes
    content: Mount /api/media routes in server/server.js
    status: completed
  - id: update-rsvp-route
    content: Update server/routes/rsvp.js to work with email-based users and auto-create accounts
    status: completed
  - id: update-api-client
    content: Update client/src/api/client.js — remove OTP methods, add register/login/setPassword/lookup/media methods
    status: completed
  - id: update-auth-context
    content: Update client/src/context/AuthContext.jsx for email-based flow and localStorage email tracking
    status: completed
  - id: create-unified-rsvp-form
    content: Create client/src/components/RSVPFormUnified.jsx with guest/returning states, email field with proper mobile attributes
    status: completed
  - id: create-edit-rsvp-modal
    content: Create client/src/components/EditRSVPModal.jsx — modal for editing food/allergies or cancelling RSVP
    status: completed
  - id: update-rsvp-card-edit-button
    content: Update client/src/components/RSVPCard.jsx — add Edit button visible when RSVP belongs to logged-in user
    status: completed
  - id: create-media-upload-component
    content: Create client/src/components/MediaUpload.jsx — Cloudinary widget configured for photos+videos
    status: completed
  - id: create-gallery-modal
    content: Create client/src/components/GalleryModal.jsx — enlarged photo/video with poster info
    status: completed
  - id: create-set-password-page
    content: Create client/src/pages/SetPassword.jsx — password + confirm password form, token or email-based
    status: completed
  - id: create-upload-page
    content: Create client/src/pages/Upload.jsx — auth-gated media upload page
    status: completed
  - id: create-gallery-page
    content: Create client/src/pages/Gallery.jsx — public grid view of all uploaded media
    status: completed
  - id: create-profile-page
    content: Create client/src/pages/Profile.jsx — edit profile (name, photo, neighbor), password required, manage RSVPs and uploads
    status: completed
  - id: create-account-page
    content: Create client/src/pages/CreateAccount.jsx — standalone page to set name, profile pic, neighbor checkbox (no password needed)
    status: completed
  - id: update-header-avatar
    content: Update Header.jsx — show user avatar (profile pic or first initial) when logged in, links to /profile
    status: completed
  - id: update-app-routes
    content: Update client/src/App.jsx to add /set-password, /upload, /gallery, /profile routes
    status: completed
  - id: update-home-page
    content: Update client/src/pages/Home.jsx to use RSVPFormUnified instead of GuestRSVPForm
    status: completed
  - id: update-header-nav
    content: Update client/src/components/Header.jsx with Gallery and Upload nav links
    status: completed
  - id: update-admin-middleware
    content: Update server/middleware/adminAuth.js and adminTokenAuth.js — remove phone allowlist logic, keep password-admin token auth only
    status: completed
  - id: update-events-admin-routes
    content: Update server/routes/events.js and server/routes/admin.js — replace phone population/serialization with email
    status: completed
  - id: update-server-tests
    content: Update server/__tests__/auth.test.js, admin.test.js, rsvp.test.js — replace OTP/phone expectations with email-based flow
    status: completed
  - id: remove-phone-auth
    content: Remove Twilio OTP code from server/routes/auth.js, remove LoginModal.jsx, remove old RSVP forms
    status: completed
  - id: update-env-example
    content: Update .env.example — remove Twilio vars, document any new vars
    status: completed
  - id: run-tests
    content: Run server and client tests, fix any failures
    status: completed
  - id: create-testing-guide
    content: Create docs/TESTING_GUIDE.md with manual test scenarios for all new functionality
    status: completed
  - id: verify-implementation
    content: Run linter, verify all imports resolve, confirm server starts without errors
    status: completed
isProject: true
---

# User Authentication, Unified RSVP & Media Gallery

> **Execution requirement:** Read and understand this entire plan before making any code changes. Any subagents listed in `## Execution: Subagent dispatch` below **must be executed** via `Task(...)` calls — do not substitute prose descriptions or skip subagent delegation steps.

## Architecture Overview

```mermaid
flowchart TD
    subgraph Client [React SPA]
        RSVPForm[RSVPFormUnified]
        SetPwd[SetPassword Page]
        Upload[Upload Page]
        Gallery[Gallery Page]
        Profile[Profile Page]
        AuthCtx[AuthContext]
    end

    subgraph Server [Express API]
        AuthRoutes[/api/auth/*]
        RsvpRoutes[/api/rsvps]
        MediaRoutes[/api/media]
        EmailSvc[EmailService - Gmail API]
    end

    subgraph External
        MongoDB[(MongoDB)]
        Cloudinary[Cloudinary CDN]
    end

    RSVPForm -->|POST /api/rsvps| RsvpRoutes
    RSVPForm -->|GET /api/auth/lookup| AuthRoutes
    RsvpRoutes -->|auto-create user| AuthRoutes
    AuthRoutes -->|send password email| EmailSvc
    SetPwd -->|POST /api/auth/set-password| AuthRoutes
    Upload -->|POST /api/media| MediaRoutes
    Gallery -->|GET /api/media| MediaRoutes
    Profile -->|POST /api/auth/login + PUT| AuthRoutes

    AuthRoutes --> MongoDB
    RsvpRoutes --> MongoDB
    MediaRoutes --> MongoDB
    RSVPForm --> Cloudinary
    Upload --> Cloudinary
```

## Data Flow

1. **First-time RSVP**: User fills name + email + food + allergies. Email triggers optional profile pic upload. On submit:
   - Client calls `POST /api/rsvps` with `{name, email, food, allergies, guestCount, profilePhotoUrl?}`
   - Server creates/finds User by email, creates RSVP, sends password-set email via Gmail API
   - Server returns JWT + user info
   - Client stores JWT + email in localStorage, sets "logged in" flag

2. **Returning RSVP**: On page load, client checks localStorage for email. If found:
   - Calls `GET /api/auth/lookup?email=` to get name + profilePhotoUrl
   - Pre-fills form, collapses name/email/photo fields (shows summary)
   - User only fills food + allergies, clicks RSVP
   - Client sends with JWT from localStorage

3. **Set Password**: User clicks email link → `/set-password?token=<jwt>` or navigates to `/set-password?email=<email>`:
   - Token route: validates JWT, shows password form (2 fields: password + confirm)
   - Email route: checks if password already set → if not, allows setting. If set, redirects to login.
   - On submit: `POST /api/auth/set-password` with bcrypt hashing server-side

4. **Profile Page**: User navigates to `/profile`:
   - Must enter current password to unlock edit mode for name/photo changes
   - Can change name, profile photo
   - Calls `POST /api/auth/login` to verify password, then `PUT /api/auth/profile`
   - Below profile info, shows **"Your RSVPs"** section: lists all of the user's RSVPs (current + past events) via `GET /api/rsvps/mine`. Each RSVP shows event date, food, allergies, status. Active RSVPs have an "Edit" button (opens EditRSVPModal) and a "Cancel" button.
   - Below RSVPs, shows **"Your Uploads"** section: grid of the user's uploaded photos/videos via `GET /api/media/mine`. Each item shows thumbnail + delete button. Clicking delete removes the media (with confirmation). Clicking the thumbnail opens GalleryModal.

5. **Edit/Cancel RSVP**: When a logged-in user views the RSVP list on Home:
   - Each RSVP card checks if `rsvp.userId === currentUser.id` (or matched by email from the response)
   - If it's the user's own RSVP, an "Edit" button appears on the card
   - Clicking "Edit" opens `EditRSVPModal` pre-filled with current food + allergies
   - User can change food/allergies and click "Save" → `PUT /api/rsvps/:id` with `{food, guestCount}`
   - User can click "Cancel RSVP" → confirmation prompt → `DELETE /api/rsvps/:id` (soft cancel)
   - On success, the RSVP list refreshes to show updated data (or removes the cancelled RSVP)

6. **Media Upload**: User navigates to `/upload`:
   - Must be logged in (have JWT). If not, redirect to home with message.
   - Opens Cloudinary widget (photos: max 10MB, jpg/png/webp/gif; videos: max 100MB, mp4/mov/webm)
   - On success, calls `POST /api/media` with cloudinaryUrl, mediaType, thumbnailUrl

7. **Gallery View**: Public page at `/gallery`:
   - `GET /api/media` returns paginated list with user info populated
   - Renders responsive grid of thumbnails
   - Click → GalleryModal with full-size media + poster name/profilePic at bottom

## Files to Create

- **server/models/Media.js** — Mongoose model: userId (ref User), cloudinaryUrl, mediaType (enum: photo/video), thumbnailUrl, publicId (Cloudinary), createdAt. Index on createdAt descending.
- **server/routes/media.js** — `POST /` (requireAuth, validate body), `GET /` (public, paginated, populate user name+photo), `GET /mine` (requireAuth, returns user's own media), `GET /:id` (single item), `DELETE /:id` (requireAuth, owner-only, deletes media document).
- **client/src/components/RSVPFormUnified.jsx** — Consolidated form with two visual states. Guest state: name, email (with autocomplete="email" inputmode="email"), food categories + custom, allergies. When email entered and account does NOT already exist: shows "I'm a neighbor" checkbox + optional PhotoUpload. Returning state: summary bar (name + avatar), food + allergies only (neighbor checkbox not shown — already set on profile).
- **client/src/components/MediaUpload.jsx** — Cloudinary Upload Widget configured for the `barbecue-mondays/media` folder. Accepts photos + videos. Returns URL, type, thumbnail.
- **client/src/components/EditRSVPModal.jsx** — Modal for logged-in users to edit their RSVP. Shows food category toggles + custom input (pre-filled with current food), allergies field (pre-filled). "Save" and "Cancel RSVP" buttons. On save: calls `PUT /api/rsvps/:id`. On cancel RSVP: confirms, then calls `DELETE /api/rsvps/:id`. Close via X button, overlay click, or Escape key.
- **client/src/components/GalleryModal.jsx** — Fixed overlay modal. Shows `<img>` or `<video controls>` at max viewport size. Bottom bar: poster profile pic + name. Close button + click-outside-to-close.
- **client/src/pages/SetPassword.jsx** — Reads `token` or `email` from URL params. Two password fields with validation (min 8 chars, must match). Submit calls API.
- **client/src/pages/Upload.jsx** — Auth-gated page. Shows MediaUpload widget. Lists user's own recent uploads below.
- **client/src/pages/Gallery.jsx** — Public masonry/grid of all media. Infinite scroll or load-more. Each tile shows thumbnail. Click opens GalleryModal.
- **client/src/pages/CreateAccount.jsx** — Standalone page for setting up your account. Accessible at `/create-account`. Shows: name input, PhotoUpload for profile pic, "I'm a neighbor" checkbox. No password needed — just saves to the user model via `PUT /api/auth/profile-setup` (a new lightweight endpoint that doesn't require password, only valid JWT). If already has name set, pre-fills the form. Redirect to home on save. Linked from the password-set success screen and from a "Complete your profile" prompt.
- **client/src/pages/Profile.jsx** — Shows current profile info (name, email, photo, neighbor status). "Edit Profile" button requires password entry to unlock name/photo/neighbor changes. Below that: "Your RSVPs" section listing all user's RSVPs with edit/cancel actions, and "Your Uploads" section showing a grid of user's media with delete capability.
- **docs/TESTING_GUIDE.md** — Manual testing scenarios covering all flows.

## Files to Modify

- **[server/models/User.js](server/models/User.js)** — Replace `phone` (required unique) with `email` (required unique). Add `passwordHash` (String, default ""), `passwordResetToken` (String), `passwordResetExpires` (Date), `isNeighbor` (Boolean, default false). Keep name + profilePhotoUrl.
- **[server/routes/auth.js](server/routes/auth.js)** — Remove all Twilio OTP code. Add: `POST /register` (create user by email, return JWT, trigger password email), `POST /login` (email + password → JWT), `POST /set-password` (token-based or email-based), `GET /lookup` (email query → public user info including `isNeighbor`), `GET /me` (unchanged logic). Keep rate limiting. `PUT /profile` should also accept `isNeighbor` boolean for toggling neighbor status. Add `PUT /profile-setup` (requireAuth, no password needed) — accepts `{ name, profilePhotoUrl, isNeighbor }` and updates the user. This is used by the Create Account page for initial profile setup before a password is set.
- **[server/middleware/auth.js](server/middleware/auth.js)** — Update `createJwtToken` payload to `{userId, email}`. Update `requireAuth` to set `request.user = {userId, email}`.
- **[server/services/emailService.js](server/services/emailService.js)** — Add `sendPasswordSetEmail(email, token, clientOrigin)` method that sends HTML email with link to `${clientOrigin}/set-password?token=${token}`.
- **[server/server.js](server/server.js)** — Import and mount media routes at `/api/media`.
- **[server/routes/rsvp.js](server/routes/rsvp.js)** — Update `POST /` to accept `email` and `isNeighbor` (boolean, optional) fields. When email provided and no JWT: auto-create user (or find existing), set `isNeighbor` on the user model if provided. Update notification to include email instead of phone. Update `PUT /:id` schema to also accept `allergies: z.string().trim().optional().default("")` and persist it in the findOneAndUpdate call. Add `GET /mine` (requireAuth) — returns all RSVPs for the logged-in user (populate eventId for date/theme), sorted by createdAt desc.
- **[client/src/App.jsx](client/src/App.jsx)** — Add lazy routes: `/set-password`, `/upload`, `/gallery`, `/profile`, `/create-account`.
- **[client/src/api/client.js](client/src/api/client.js)** — Remove `sendOtp`/`verifyOtp`. Add: `register(email, name)`, `login(email, password)`, `setPassword(token, password)`, `setPasswordByEmail(email, password)`, `lookupUser(email)`, `setupProfile(body)` (PUT /api/auth/profile-setup), `uploadMedia(body)`, `getMedia(page)`, `getMediaById(id)`, `getMyMedia()`, `deleteMedia(id)`, `getMyRsvps()`.
- **[client/src/context/AuthContext.jsx](client/src/context/AuthContext.jsx)** — Add `email` to state. On login, store email in `localStorage('barbecue-mondays-user-email')`. Expose `storedEmail` from context. Update `refreshUser` to work with new `/me` endpoint.
- **[client/src/components/RSVPCard.jsx](client/src/components/RSVPCard.jsx)** — Add `isOwner` and `onEdit` props. When `isOwner` is true, show an "Edit" button (pencil icon or text) that calls `onEdit(rsvp)`. Style consistently with existing admin "Remove" button but use a neutral/blue color. When `rsvp.isNeighbor` is true, show a "Neighbor" badge next to the attendee name — small rounded pill (bg-pb-palm/10 text-pb-palm text-xs font-medium px-2 py-0.5) with a subtle left-to-right shimmer animation (CSS keyframe `neighbor-swish`: translateX(-100%) → translateX(100%) on a pseudo-element gradient overlay, ~3s infinite).
- **[client/src/pages/Home.jsx](client/src/pages/Home.jsx)** — Replace `<GuestRSVPForm>` import/usage with `<RSVPFormUnified>`. Pass auth context data for returning user detection. Import `EditRSVPModal`. Add state for `editingRsvp`. Pass `isOwner` and `onEdit` to RSVPCard when the rsvp belongs to the logged-in user (match by userId or email). Render `EditRSVPModal` when `editingRsvp` is set. On modal save/cancel, refresh the RSVP list.
- **[client/src/index.css](client/src/index.css)** — Add `@keyframes neighbor-swish` animation (translateX -100% → 100%) and a `.neighbor-badge-shimmer` utility class that applies it (3s ease-in-out infinite).
- **[client/src/components/Header.jsx](client/src/components/Header.jsx)** — Add "Gallery" and "Upload" nav links (both always visible; the Upload page itself handles auth gating). When user is logged in (useAuth().isAuthenticated): replace the logo on the right side of the nav (or add alongside) with a user avatar that links to `/profile`. Avatar: if `user.profilePhotoUrl` exists, show a 32x32 rounded-full `<img>`. If no photo, show a 32x32 rounded-full div with bg-pb-palm and the user's first initial (uppercase, text-white, text-sm font-bold, flex centered). The avatar replaces or sits beside the nav links on the right.
- **[server/middleware/adminAuth.js](server/middleware/adminAuth.js)** — Remove phone allowlist logic entirely. Replace `requireAdmin` with a simple check for `request.adminPasswordAuth === true` (set by adminTokenAuth). This middleware is used by events routes for theme setting.
- **[server/middleware/adminTokenAuth.js](server/middleware/adminTokenAuth.js)** — Remove phone allowlist fallback from `requireAdminAccess`. Only accept password-based admin JWT (`adminPasswordAuth: true` claim). Remove `getAdminPhones` helper.
- **[server/routes/events.js](server/routes/events.js)** — Replace `.populate("userId", "name phone profilePhotoUrl")` with `.populate("userId", "name email profilePhotoUrl isNeighbor")`. Replace `phone: rsvp.userId?.phone` with `email: rsvp.userId?.email`. Add `userId: rsvp.userId?._id?.toString() || null` and `isNeighbor: rsvp.userId?.isNeighbor || false` to the RSVP serialization so the client can show the neighbor badge and detect ownership.
- **[server/routes/admin.js](server/routes/admin.js)** — Same phone→email population/serialization fix as events.js.
- **[server/__tests__/auth.test.js](server/__tests__/auth.test.js)** — Rewrite to test register/login/set-password/lookup/me/profile endpoints instead of OTP flow.
- **[server/__tests__/admin.test.js](server/__tests__/admin.test.js)** — Update admin auth tests to use only password-based admin tokens (remove phone allowlist tests).
- **[server/__tests__/rsvp.test.js](server/__tests__/rsvp.test.js)** — Update RSVP tests: replace phone-based user creation with email-based, test auto-account-creation via email field.
- **[.env.example](.env.example)** — Remove `TWILIO_*`, `DEFAULT_COUNTRY_CODE`, `ADMIN_PHONES` (phone-specific). Keep all others. Add `VITE_CLOUDINARY_MEDIA_UPLOAD_PRESET` for media uploads.

## Files to Remove

- **client/src/components/GuestRSVPForm.jsx** — Replaced by RSVPFormUnified
- **client/src/components/RSVPForm.jsx** — Replaced by RSVPFormUnified
- **client/src/components/LoginModal.jsx** — No longer needed (no phone OTP UI)

## Key Design Decisions

- **Email as identifier, password optional**: The user model uses email as the unique key. Password is only set when the user wants to edit their profile. RSVP and uploads work with just the JWT issued at account creation. This keeps the flow seamless.
- **Auto-account-creation during RSVP**: When a user provides their email in the RSVP form, the server either finds or creates their account. This avoids a separate signup step. The JWT is returned so subsequent requests (uploads) are authenticated.
- **localStorage for returning user detection**: Storing email locally lets the form pre-fill on return visits without requiring login. The lookup endpoint provides name + photo for display.
- **bcrypt for passwords**: Battle-tested, widely supported. Rounds = 12 (good balance of security vs speed).
- **Cloudinary for all media**: Single service for profile photos + event media. Profile photos: 2MB max, auto-cropped to 200x200. Event media: photos 10MB, videos 100MB. Separate upload presets for each.
- **Gmail API for password emails**: Reuses existing infrastructure. No new service account needed.
- **Password-set token as JWT**: Short-lived (1 hour) JWT with `{userId, purpose: 'set-password'}`. Stateless, automatically expires. The `/set-password?email=` fallback only works if no password has been set yet (prevents unauthorized resets).
- **Public gallery, auth-gated uploads**: Viewing is public (community sharing). Uploading requires a valid JWT to prevent anonymous spam.

## Caveats / Things to Verify

- **Existing User data migration**: If any Users exist in MongoDB with `phone` field but no `email`, they will need manual migration or a script. Based on codebase analysis, the LoginModal was never wired to UI, so likely zero phone-auth users exist in production.
- **Cloudinary free tier limits**: 25GB storage, 25GB bandwidth/month. Video uploads are the biggest risk. Monitor usage if the BBQ group is large.
- **Gmail API sending limits**: Google Workspace service accounts can send ~2000 emails/day. More than sufficient for a BBQ group.
- **RSVP model `food` field is required in Mongoose schema**: The unified form must ensure food is always provided before submission (validated client-side and server-side).
- **Email deliverability**: Gmail API sends from `SEND_AS_ALIAS`. Ensure SPF/DKIM are configured for the sending domain to avoid spam folder.
- **Video thumbnails**: Cloudinary auto-generates thumbnails for videos. The `derived` URL pattern is `https://res.cloudinary.com/<cloud>/video/upload/so_0,w_400,h_300,c_fill/<public_id>.jpg`. The client should construct this from the video URL.

## Execution: Subagent dispatch

### Phase 1: Server-side user model + auth (sequential)

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Update User model and install bcrypt",
  prompt="In the barbecue-mondays project:\n\n1. Run `npm install bcrypt` in the server/ directory.\n\n2. Edit server/models/User.js to replace the phone-based schema with:\n   - email: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true }\n   - name: { type: String, trim: true, default: '' }\n   - profilePhotoUrl: { type: String, trim: true, default: '' }\n   - passwordHash: { type: String, default: '' }\n   - passwordResetToken: { type: String, default: '' }\n   - passwordResetExpires: { type: Date, default: null }\n   - isNeighbor: { type: Boolean, default: false }\n   Keep timestamps: true. Export as before.\n\n3. Edit server/middleware/auth.js:\n   - Change createJwtToken to accept {userId, email} payload\n   - Update requireAuth to set request.user = {userId, email} from decoded token\n   - Update optionalAuth similarly\n   - Keep all existing helper functions (getBearerToken, verifyToken, respondUnauthorized)\n\nReturn when files are saved and lint-clean."
)
```

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Rewrite auth routes for email-based system",
  prompt="In the barbecue-mondays project, rewrite server/routes/auth.js completely. Remove all Twilio OTP code.\n\nNew endpoints:\n\n1. POST /register\n   - Body schema (zod): { email: z.string().email(), name: z.string().trim().min(1) }\n   - Logic: findOneAndUpdate User by email (upsert). Set name if provided and user is new. Create JWT with {userId, email}. Generate a password-set token (JWT with {userId, purpose:'set-password'}, expires 1h). Call emailService.sendPasswordSetEmail(email, passwordSetToken, clientOrigin). Return {token, user: {id, email, name, profilePhotoUrl}}.\n   - clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173'\n   - Rate limit: 5 per 10 minutes per IP\n\n2. POST /login\n   - Body: { email: z.string().email(), password: z.string().min(8) }\n   - Logic: Find user by email. If not found or no passwordHash, return 401. Compare with bcrypt. If match, return JWT + user. If not, return 401.\n   - Rate limit: 10 per 10 minutes\n\n3. POST /set-password\n   - Body: { token: z.string().optional(), email: z.string().email().optional(), password: z.string().min(8), confirmPassword: z.string().min(8) }\n   - Validation: password === confirmPassword, at least one of token or email provided\n   - Token path: verify JWT, extract userId, find user, hash password with bcrypt (rounds=12), save.\n   - Email path: find user by email. If passwordHash already set, return 400 'Password already set, use login'. Otherwise hash and save.\n   - Return { success: true }\n   - Rate limit: 5 per 10 minutes\n\n4. GET /lookup\n   - Query: { email: z.string().email() }\n   - Logic: Find user by email. If found, return { exists: true, name, profilePhotoUrl, isNeighbor }. If not, return { exists: false }.\n   - Rate limit: 20 per 10 minutes\n\n5. GET /me (keep existing logic but update for email-based user)\n   - requireAuth middleware\n   - Return { user: { id, email, name, profilePhotoUrl, isNeighbor } }\n\n6. PUT /profile\n   - requireAuth middleware\n   - Body: { password: z.string().min(8), name: z.string().trim().optional(), profilePhotoUrl: z.string().url().optional(), isNeighbor: z.boolean().optional() }\n   - Logic: verify password against user.passwordHash. If valid, update name/profilePhotoUrl/isNeighbor. Return updated user (include isNeighbor in response).\n\n7. PUT /profile-setup\n   - requireAuth middleware (JWT only, no password required)\n   - Body: { name: z.string().trim().min(1).optional(), profilePhotoUrl: z.string().url().optional().or(z.literal('')), isNeighbor: z.boolean().optional() }\n   - Logic: find user by request.user.userId, update any provided fields, save, return updated user { id, email, name, profilePhotoUrl, isNeighbor }\n   - This endpoint is for initial profile setup before a password is set (used by Create Account page)\n\nImport bcrypt, use bcrypt.hash(password, 12) and bcrypt.compare(password, hash). Import emailService from '../services/emailService.js'. Import createJwtToken and requireAuth from middleware. Use zod validateRequest pattern matching existing code.\n\nReturn when file is saved and lint-clean."
)
```

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Add password email to emailService",
  prompt="In server/services/emailService.js, add a new method to the EmailService class:\n\nasync sendPasswordSetEmail(recipientEmail, token, clientOrigin) {\n  const link = `${clientOrigin}/set-password?token=${token}`;\n  const htmlBody = /* HTML template with:\n    - Heading: 'Set Your BBQ On Ingraham Password'\n    - Body: 'You recently RSVP'd to BBQ On Ingraham. Click the link below to set your password. This is optional — you only need a password if you want to edit your profile later.'\n    - CTA button linking to ${link}\n    - Fallback text: 'Or copy this link: ${link}'\n    - Note: 'This link expires in 1 hour.'\n    - Style matching the existing RSVP notification template (font-family Arial, color #3b3834, heading color #2E6F95)\n  */;\n  await this.sendEmail([recipientEmail], 'Set Your Password — BBQ On Ingraham', htmlBody);\n}\n\nKeep all existing methods unchanged. Return when file is saved."
)
```

### Phase 2: Media model + routes, RSVP route update (can run concurrently)

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Create Media model and routes",
  prompt="In the barbecue-mondays project:\n\n1. Create server/models/Media.js:\n   - Schema fields: userId (ObjectId ref 'User', required, index), cloudinaryUrl (String, required, trim), publicId (String, required, trim), mediaType (String, enum ['photo','video'], required), thumbnailUrl (String, trim, default ''), createdAt (Date, default Date.now, index with -1 sort)\n   - Add timestamps: true\n   - Export as 'Media'\n\n2. Create server/routes/media.js:\n   - Import Router, z, requireAuth, optionalAuth, validateRequest, Media, User, createHttpError, logger\n   \n   POST / (requireAuth):\n   - Body schema: { cloudinaryUrl: z.string().url(), publicId: z.string().min(1), mediaType: z.enum(['photo','video']), thumbnailUrl: z.string().url().optional().or(z.literal('')) }\n   - Create Media document with request.user.userId\n   - Return 201 with the created media document\n   \n   GET / (public, no auth):\n   - Query params: page (default 1), limit (default 20, max 50)\n   - Find Media sorted by createdAt desc, skip/limit for pagination\n   - Populate userId with 'name profilePhotoUrl'\n   - Return { media: [...], page, totalPages, total }\n   \n   GET /mine (requireAuth):\n   - Find Media where userId === request.user.userId, sorted by createdAt desc\n   - Return { media: [...] }\n   \n   GET /:id (public):\n   - Find by ID, populate userId with 'name profilePhotoUrl'\n   - If not found, 404\n   - Return { media: doc }\n   \n   DELETE /:id (requireAuth, owner-only):\n   - Find media by ID where userId === request.user.userId\n   - If not found or not owner, 404\n   - Delete the document\n   - Return 200 { success: true }\n\n3. In server/server.js, import and mount: app.use('/api/media', mediaRoutes);\n   Add it after the rsvp routes import/mount.\n\nReturn when all files are saved and lint-clean."
)
```

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Update RSVP route for email-based accounts",
  prompt="In server/routes/rsvp.js, update the POST / handler to support email-based auto-account-creation:\n\n1. Add to the createRsvpSchema body: email: z.string().email().optional(), isNeighbor: z.boolean().optional()\n\n2. In the route handler, after checking event.cancelled, add this logic:\n   - If no request.user AND request.body.email is provided:\n     a. Find or create User by email: User.findOneAndUpdate({email}, {$setOnInsert: {email, name: request.body.name || ''}}, {upsert: true, returnDocument: 'after'})\n     b. If request.body.name and user.name !== request.body.name, update user.name\n     c. If request.body.profilePhotoUrl, update user.profilePhotoUrl\n     c2. If request.body.isNeighbor is defined (boolean), set user.isNeighbor = request.body.isNeighbor\n     d. await user.save()\n     e. Create JWT: const token = createJwtToken({userId: user._id.toString(), email: user.email})\n     f. Set isGuest = false, set request.user = {userId: user._id.toString(), email: user.email}\n     g. Store token to return in response\n   - If no request.user AND no email: treat as guest (existing behavior)\n\n3. Import createJwtToken from '../middleware/auth.js'\n\n4. In the response, include the token if one was created: add 'token' field to the JSON response (only when auto-registered).\n\n5. Update the email notification section: replace phone references with email (user?.email || 'Guest RSVP').\n\n6. Update the PUT /:id route:\n   - Add allergies to updateRsvpSchema body: allergies: z.string().trim().optional().default('')\n   - In the findOneAndUpdate call, include allergies: request.body.allergies alongside food and guestCount\n   - In the response, include allergies: rsvp.allergies\n\n7. Add GET /mine route (requireAuth):\n   - Find all RSVPs where userId === request.user.userId, sorted by createdAt desc\n   - Populate eventId with 'date theme cancelled'\n   - Return { rsvps: rsvps.map(r => ({ id, eventDate: r.eventId?.date, eventTheme: r.eventId?.theme, food, allergies, guestCount, cancelledAt, createdAt })) }\n   - Place this route BEFORE /:id routes so Express doesn't treat 'mine' as an id param\n\n8. Keep DELETE logic unchanged.\n\nReturn when file is saved and lint-clean."
)
```

### Phase 3: Client-side updates (sequential within, but Phase 3a and 3b can be concurrent)

**Phase 3a: API client + Auth context + App routes**

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Update API client and AuthContext for email auth",
  prompt="In the barbecue-mondays project:\n\n1. Edit client/src/api/client.js:\n   - Remove sendOtp and verifyOtp methods\n   - Add these methods to apiClient:\n     register: (email, name) => request('/api/auth/register', { method: 'POST', body: { email, name } })\n     login: (email, password) => request('/api/auth/login', { method: 'POST', body: { email, password } })\n     setPassword: (token, password, confirmPassword) => request('/api/auth/set-password', { method: 'POST', body: { token, password, confirmPassword } })\n     setPasswordByEmail: (email, password, confirmPassword) => request('/api/auth/set-password', { method: 'POST', body: { email, password, confirmPassword } })\n     lookupUser: (email) => request(`/api/auth/lookup?email=${encodeURIComponent(email)}`)\n     uploadMedia: (body) => request('/api/media', { method: 'POST', body })\n     getMedia: (page = 1, limit = 20) => request(`/api/media?page=${page}&limit=${limit}`)\n     getMediaById: (id) => request(`/api/media/${id}`)\n     getMyMedia: () => request('/api/media/mine')\n     deleteMedia: (id) => request(`/api/media/${id}`, { method: 'DELETE' })\n     getMyRsvps: () => request('/api/rsvps/mine')\n     updateProfile: (body) => request('/api/auth/profile', { method: 'PUT', body })\n     setupProfile: (body) => request('/api/auth/profile-setup', { method: 'PUT', body })\n\n2. Edit client/src/context/AuthContext.jsx:\n   - Add constant: const EMAIL_STORAGE_KEY = 'barbecue-mondays-user-email';\n   - In login callback: also store email in localStorage using EMAIL_STORAGE_KEY (extract from nextUser.email)\n   - In logout callback: also remove EMAIL_STORAGE_KEY from localStorage\n   - Add to state: storedEmail (initialized from localStorage.getItem(EMAIL_STORAGE_KEY))\n   - Expose storedEmail in the context value object\n   - Update refreshUser: if response.user has email, store it in localStorage\n\n3. Edit client/src/App.jsx:\n   - Add lazy imports for: SetPasswordPage, UploadPage, GalleryPage, ProfilePage, CreateAccountPage\n   - Add routes: /set-password, /upload, /gallery, /profile, /create-account\n   - Keep existing routes unchanged\n\nReturn when all files are saved and lint-clean."
)
```

**Phase 3b: New pages (can be concurrent with each other after 3a completes)**

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Create SetPassword and Profile pages",
  prompt="In the barbecue-mondays project, create two new pages:\n\n1. client/src/pages/SetPassword.jsx:\n   - Import useSearchParams from react-router-dom, useState, apiClient, useAuth\n   - Read 'token' and 'email' from URL search params\n   - If neither token nor email: show error message 'Invalid link'\n   - Form with: password (type=password, minLength=8, autocomplete='new-password'), confirmPassword (type=password, autocomplete='new-password')\n   - Client-side validation: both fields match, min 8 chars\n   - On submit: if token, call apiClient.setPassword(token, password, confirmPassword). If email, call apiClient.setPasswordByEmail(email, password, confirmPassword)\n   - Success state: 'Password set successfully!' with a link to /create-account saying 'Complete your profile' (set your photo, name, neighbor status)\n   - Error state: display API error message\n   - Style with existing Tailwind classes: surface-card, input-field, rounded-full buttons matching app theme (bg-pb-palm text-white)\n   - Export as default\n\n2. client/src/pages/Profile.jsx:\n   - Import useState, useEffect, useAuth, apiClient, PhotoUpload, EditRSVPModal, GalleryModal\n   - If not authenticated (useAuth().isAuthenticated is false): show 'Please RSVP first to create your account' with link to /#rsvp\n   \n   Section 1 - Profile Info:\n   - Display current profile: name, email (read-only), profile photo, neighbor badge (if isNeighbor)\n   - 'Edit Profile' button: opens password verification step\n   - Password field: user enters current password\n   - On password verify: show edit fields — name input, photo upload, 'I'm a neighbor' checkbox (pre-checked if user.isNeighbor)\n   - On save: call apiClient.updateProfile({ password, name: newName, profilePhotoUrl: newPhoto, isNeighbor })\n   - Success: update displayed info, show success message\n   \n   Section 2 - Your RSVPs:\n   - On mount (if authenticated): fetch apiClient.getMyRsvps()\n   - List each RSVP as a card: show event date (formatted), food, allergies, theme if set\n   - Active RSVPs (cancelledAt is null): show 'Edit' button and 'Cancel' button\n   - Edit button: opens EditRSVPModal (same component used on Home page)\n   - Cancel button: confirmation prompt, then apiClient.cancelRsvp(id), refresh list\n   - Cancelled RSVPs: shown greyed out with 'Cancelled' badge, no action buttons\n   - Empty state: 'You haven't RSVP'd to any events yet.'\n   \n   Section 3 - Your Uploads:\n   - On mount (if authenticated): fetch apiClient.getMyMedia()\n   - Grid of thumbnails (grid-cols-2 sm:grid-cols-3 gap-2)\n   - Each tile: thumbnail image, overlay delete button (X icon, top-right, bg-black/50 text-white rounded-full)\n   - Click thumbnail: open GalleryModal with that media item\n   - Click delete: confirmation prompt ('Delete this photo/video?'), then apiClient.deleteMedia(id), refresh list\n   - Videos show play icon overlay on thumbnail\n   - Empty state: 'You haven't uploaded any photos or videos yet.'\n   \n   - Style matching app theme. Use surface-card, input-field classes.\n   - Export as default\n\nReturn when files are saved and lint-clean."
)
```

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Create Upload and Gallery pages with components",
  prompt="In the barbecue-mondays project, create the media upload and gallery pages:\n\n1. client/src/components/MediaUpload.jsx:\n   - Similar to PhotoUpload.jsx but configured for media (photos + videos)\n   - Cloudinary widget config: cloudName from VITE_CLOUDINARY_CLOUD_NAME, uploadPreset from VITE_CLOUDINARY_MEDIA_UPLOAD_PRESET (new env var, fallback to VITE_CLOUDINARY_UPLOAD_PRESET)\n   - folder: 'barbecue-mondays/media'\n   - sources: ['local', 'camera']\n   - clientAllowedFormats: ['jpg','jpeg','png','webp','gif','mp4','mov','webm']\n   - maxImageFileSize: 10_000_000 (10MB)\n   - maxVideoFileSize: 100_000_000 (100MB)\n   - multiple: true (allow batch uploads)\n   - Props: onUpload(info) callback called per successful upload with {secure_url, resource_type, public_id, thumbnail_url}\n   - The thumbnail_url for videos: construct as secure_url but replace '/video/upload/' with '/video/upload/so_0,w_400,h_300,c_fill/' and change extension to .jpg\n   - Export named: MediaUpload\n\n2. client/src/components/GalleryModal.jsx:\n   - Props: media (object with cloudinaryUrl, mediaType, user: {name, profilePhotoUrl}), onClose\n   - Fixed inset-0 overlay with bg-black/80, z-50, flex center\n   - If mediaType === 'photo': <img> with max-h-[85vh] max-w-[90vw] object-contain\n   - If mediaType === 'video': <video controls autoPlay> with same max dimensions\n   - Bottom bar: white bg, rounded, shows user profile pic (32x32 rounded-full) + name\n   - Close button: top-right X icon (absolute positioned)\n   - Click on overlay (not content) closes modal\n   - Escape key closes modal (useEffect with keydown listener)\n   - Export named: GalleryModal\n\n3. client/src/pages/Upload.jsx:\n   - Import useAuth, apiClient, MediaUpload, useState, useEffect\n   - If not authenticated: show message 'You need to RSVP first to upload photos and videos' with link to /#rsvp\n   - Show MediaUpload component\n   - On each successful upload: call apiClient.uploadMedia({ cloudinaryUrl, publicId, mediaType, thumbnailUrl })\n   - Show list of successfully uploaded items below (thumbnails in a grid)\n   - Show upload count: 'X items uploaded this session'\n   - Style with surface-card, app theme colors\n   - Export as default\n\n4. client/src/pages/Gallery.jsx:\n   - Import useState, useEffect, apiClient, GalleryModal\n   - On mount: fetch apiClient.getMedia(1)\n   - Responsive grid: grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2\n   - Each tile: aspect-square overflow-hidden rounded-lg. Photos: <img> object-cover. Videos: <img> of thumbnailUrl with play icon overlay (SVG triangle in a circle, centered)\n   - Click tile: set selectedMedia state, show GalleryModal\n   - 'Load More' button at bottom if more pages exist\n   - Empty state: 'No photos or videos yet. Be the first to share!'\n   - Page title: 'BBQ Gallery'\n   - Export as default\n\nReturn when all files are saved and lint-clean."
)
```

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Create Account page and Header avatar",
  prompt="In the barbecue-mondays project:\n\n1. Create client/src/pages/CreateAccount.jsx:\n   - Import useState, useNavigate from react-router-dom, useAuth, apiClient, PhotoUpload\n   - If not authenticated: show 'You need to RSVP first' message with link to /#rsvp\n   - If authenticated: show a form to complete profile setup\n   - Form fields:\n     a. Name input (pre-filled from user.name if already set, autoComplete='name', required)\n     b. PhotoUpload component for profile pic (optional)\n     c. 'I'm a neighbor' checkbox (pre-checked if user.isNeighbor)\n   - Preview: show current avatar (profile pic if set, otherwise first initial in a colored circle)\n   - Submit button: 'Save Profile'\n   - On submit: call apiClient.setupProfile({ name, profilePhotoUrl, isNeighbor })\n   - On success: call refreshUser() from auth context to update global state, then navigate to '/'\n   - Style: surface-card, centered max-w-md, input-field, rounded-full buttons\n   - Page title: 'Set Up Your Profile'\n   - Export as default\n\n2. Edit client/src/components/Header.jsx:\n   - Import useAuth from '../context/AuthContext.jsx'\n   - Import Link (already imported)\n   - Get { user, isAuthenticated } from useAuth()\n   - Add 'Gallery' NavLink pointing to /gallery in the desktop nav\n   - Add 'Upload' NavLink pointing to /upload in the desktop nav\n   - After the nav links (right side), add a user avatar section:\n     - If isAuthenticated and user exists:\n       - If user.profilePhotoUrl: render <Link to='/profile'><img src={user.profilePhotoUrl} alt='Profile' className='h-8 w-8 rounded-full object-cover border-2 border-white/30' /></Link>\n       - If no profilePhotoUrl but user.name: render <Link to='/profile'><div className='flex h-8 w-8 items-center justify-center rounded-full bg-pb-palm border-2 border-white/30'><span className='text-sm font-bold text-white'>{user.name.charAt(0).toUpperCase()}</span></div></Link>\n       - If no name either: use 'U' as fallback initial\n     - If not authenticated: render nothing in the avatar area (no sign-in link)\n   - Also add Gallery/Upload to the mobile menu nav if isMenuOpen\n   - Keep all existing nav links (Home, About)\n\nReturn when files are saved and lint-clean."
)
```

### Phase 4: Wire up Home page + Header + RSVP edit/cancel (sequential)

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Add neighbor-swish animation to index.css",
  prompt="In client/src/index.css, add the following CSS at the end of the file (after any existing rules):\n\n@keyframes neighbor-swish {\n  0% { transform: translateX(-100%); }\n  100% { transform: translateX(100%); }\n}\n\n.neighbor-badge-shimmer {\n  position: absolute;\n  inset: 0;\n  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);\n  animation: neighbor-swish 3s ease-in-out infinite;\n}\n\nReturn when the file is saved."
)
```

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Create unified RSVP form and wire into Home",
  prompt="In the barbecue-mondays project:\n\n1. Create client/src/components/RSVPFormUnified.jsx:\n   - Import: useState, useEffect, useRef, useAuth (from context), apiClient, PhotoUpload, getClosestMondayInputValue (from utils/date.js)\n   - Constants: FOOD_CATEGORIES = ['Meat', 'Side', 'Dessert']\n   - Props: { cancelled, onSubmit, eventDate }\n   \n   Component logic:\n   - const { storedEmail, isAuthenticated, login } = useAuth()\n   - State: { name, email (init from storedEmail || ''), foodCategory, foodCustom, allergies, guestCount: 1, profilePhotoUrl: '', isNeighbor: false }\n   - State: isReturningUser (boolean), returnedUserData (null or {name, profilePhotoUrl, isNeighbor})\n   - State: isSubmitting, errorMessage, showProfileUpload, showNeighborCheckbox (false)\n   \n   Email field behavior:\n   - On email blur (or 300ms debounce after typing): if valid email format, call apiClient.lookupUser(email)\n   - If exists: set isReturningUser=true, set returnedUserData, pre-fill name from response, show summary instead of full fields (neighbor checkbox NOT shown — already on their profile)\n   - If not exists: set showProfileUpload=true AND showNeighborCheckbox=true (show optional photo upload + neighbor checkbox)\n   \n   If cancelled prop: show read-only 'RSVPs are closed' (same as current GuestRSVPForm)\n   \n   Rendering (guest/new user state):\n   - Name field (required, autoComplete='name')\n   - Email field (type='email', inputMode='email', autoComplete='email', name='email', placeholder='your@email.com')\n   - Food category toggles (same UI as current GuestRSVPForm: Meat/Side/Dessert buttons + custom input)\n   - Allergies field (optional)\n   - If showNeighborCheckbox: checkbox input + label 'I'm a neighbor' (styled as toggle or standard checkbox with text-sm)\n   - If showProfileUpload: PhotoUpload component (optional, labeled 'Add a profile photo (optional)')\n   - Submit button: 'RSVP'\n   \n   Rendering (returning user state):\n   - Summary bar: shows profile pic (or placeholder) + name + email, with 'Not you?' link to reset to guest state\n   - Food category toggles + custom input (required)\n   - Allergies field\n   - Submit button: 'RSVP'\n   \n   On submit:\n   - Build body: { eventDate: eventDate || getClosestMondayInputValue(), name, email (if provided), food (resolved from category or custom), allergies, guestCount: 1, profilePhotoUrl, isNeighbor (only include if showNeighborCheckbox was visible) }\n   - Call onSubmit(body) (parent handles API call)\n   - If response includes token: call login(token, response.user) from auth context\n   - Store email in localStorage('barbecue-mondays-user-email')\n   - Reset food/allergies fields (keep name/email for next time)\n   \n   Auto-focus name on #rsvp hash (same as current GuestRSVPForm behavior)\n   id='rsvp' on the form element\n   \n   Style: match current GuestRSVPForm styling (surface-card, input-field, rounded-full buttons, pb-palm/pb-ocean colors)\n\nReturn when all files are saved and lint-clean."
)
```

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Create EditRSVPModal and update RSVPCard + Home",
  prompt="In the barbecue-mondays project, add RSVP edit/cancel functionality for logged-in users:\n\n1. Create client/src/components/EditRSVPModal.jsx:\n   - Props: { rsvp, onClose, onSave, onCancel }\n   - rsvp shape: { id, food, allergies, guestCount, attendeeName }\n   - Fixed inset-0 overlay: bg-black/50, z-50, flex items-center justify-center\n   - Modal card: surface-card, max-w-md w-full mx-4, p-6, space-y-4\n   - Heading: 'Edit your RSVP'\n   - Food category toggles (FOOD_CATEGORIES = ['Meat', 'Side', 'Dessert']) — pre-select if rsvp.food matches a category, otherwise put value in custom input\n   - Custom food input (shown when no category selected, pre-filled with rsvp.food if not a category)\n   - Allergies input (pre-filled with rsvp.allergies)\n   - State: { foodCategory, foodCustom, allergies, isSubmitting }\n   - 'Save Changes' button (bg-pb-palm text-white rounded-full): resolves food from category/custom, calls onSave({ food, allergies, guestCount: rsvp.guestCount })\n   - 'Cancel my RSVP' button (text-pb-error, border border-pb-error/30 rounded-full): shows confirm prompt (window.confirm 'Are you sure you want to cancel your RSVP?'), if confirmed calls onCancel(rsvp.id)\n   - Close button: top-right X (text-pb-driftwood hover:text-pb-ink)\n   - Close on overlay click (not modal content) and Escape key\n   - Export named: EditRSVPModal\n\n2. Edit client/src/components/RSVPCard.jsx:\n   - Add props: isOwner (boolean, default false), onEdit (function)\n   - When isOwner is true, render an 'Edit' button next to the name/food info (or at the right side of the card, before the admin Remove button area)\n   - Edit button style: shrink-0 rounded-full border border-pb-ocean/30 px-3 py-1.5 text-xs font-medium text-pb-ocean hover:bg-pb-ocean/5\n   - On click: calls onEdit(rsvp)\n   - The Edit button should NOT show when isAdmin is true and onAdminDelete is provided (admin sees Remove, not Edit)\n   - If both isOwner and isAdmin, show Edit only (admin can use admin panel for removal)\n   - When rsvp.isNeighbor is true: render a 'Neighbor' badge inline next to the attendee name\n   - Badge style: relative overflow-hidden inline-flex items-center rounded-full bg-pb-palm/10 text-pb-palm text-xs font-medium px-2 py-0.5 ml-2\n   - Badge animation: a subtle left-to-right shimmer via a CSS keyframe. Add a <span> pseudo-element (absolute inset-0) with a linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent) that translates from -100% to 100% on a 3s infinite ease-in-out animation. Use inline style or a Tailwind arbitrary animation class. The keyframe name: 'neighbor-swish'.\n   - The animation MUST use the global class .neighbor-badge-shimmer defined in client/src/index.css (added in a separate task). Apply className='neighbor-badge-shimmer' to the shimmer span overlay.\n\n3. Edit client/src/pages/Home.jsx:\n   - Import EditRSVPModal from '../components/EditRSVPModal.jsx'\n   - Import useAuth from '../context/AuthContext.jsx'\n   - Add state: const [editingRsvp, setEditingRsvp] = useState(null)\n   - Get user from auth context: const { user, isAuthenticated } = useAuth()\n   - In the RSVPCard rendering loop, determine isOwner: if isAuthenticated and rsvp.userId matches user.id (the RSVP response includes userId for non-guest RSVPs)\n   - Pass isOwner and onEdit={() => setEditingRsvp(rsvp)} to RSVPCard\n   - Add handleEditSave async function: calls apiClient.updateRsvp(editingRsvp.id, body), then refreshes event data (re-fetch getNextEvent), then setEditingRsvp(null)\n   - Add handleEditCancel async function: calls apiClient.cancelRsvp(rsvpId), then refreshes event data, then setEditingRsvp(null)\n   - Render EditRSVPModal when editingRsvp is not null: <EditRSVPModal rsvp={editingRsvp} onClose={() => setEditingRsvp(null)} onSave={handleEditSave} onCancel={handleEditCancel} />\n   - Also replace GuestRSVPForm with RSVPFormUnified (import RSVPFormUnified, use it with same props pattern)\n   - Update handleSubmit to return the API response (so RSVPFormUnified can access response.token)\n\nNote: The existing server PUT /api/rsvps/:id expects { food, guestCount } and requires auth (JWT). The DELETE /api/rsvps/:id does soft cancel (sets cancelledAt). Both use requireAuth middleware. The RSVP list response from GET /api/events/next should already include userId for linked RSVPs — verify by checking server/routes/events.js response format.\n\nReturn when all files are saved and lint-clean."
)
```

### Phase 5: Admin middleware + routes phone→email migration (after Phase 1, can run concurrently with Phase 4)

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Migrate admin middleware from phone to password-only",
  prompt="In the barbecue-mondays project, update admin middleware to remove phone allowlist logic:\n\n1. Edit server/middleware/adminAuth.js:\n   - Remove normalizePhone and getAdminPhones helpers entirely\n   - Replace requireAdmin with a simple check: if request.adminPasswordAuth is not true, respond 403 'Admin access required'. Otherwise call next().\n   - Keep logger import for the warn log.\n\n2. Edit server/middleware/adminTokenAuth.js:\n   - Remove getAdminPhones function\n   - In requireAdminAccess: after verifying the JWT, only check if decoded.adminPasswordAuth === true. If yes, set request.adminPasswordAuth = true and call next(). Remove the entire phone fallback block (lines checking decoded.phone against adminPhones). If decoded.adminPasswordAuth is not true, respond 403.\n   - Keep createAdminToken function unchanged.\n\n3. Edit server/routes/events.js:\n   - Find .populate('userId', 'name phone profilePhotoUrl') and change to .populate('userId', 'name email profilePhotoUrl isNeighbor')\n   - Find phone: rsvp.userId?.phone and change to email: rsvp.userId?.email\n   - In the rsvps.map serialization (serializeEventPayload function), add: userId: rsvp.userId?._id?.toString() || null, isNeighbor: rsvp.userId?.isNeighbor || false — this lets the client show the neighbor badge and determine ownership\n\n4. Edit server/routes/admin.js:\n   - Same changes: replace phone population with email population\n   - Find .populate('userId', 'name phone profilePhotoUrl') → .populate('userId', 'name email profilePhotoUrl')\n   - Find phone: rsvp.userId?.phone → email: rsvp.userId?.email\n\nReturn when all files are saved and lint-clean."
)
```

### Phase 6: Update server tests (after Phases 1-5)

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="test-runner",
  description="Update server tests for email-based auth",
  prompt="In the barbecue-mondays project, update the server test files to work with the new email-based auth system:\n\n1. Edit server/__tests__/auth.test.js:\n   - Remove all Twilio/OTP test cases (send-otp, verify-otp)\n   - Add test cases for:\n     a. POST /api/auth/register — creates user by email, returns JWT and user object\n     b. POST /api/auth/register — upserts existing user (no duplicate)\n     c. POST /api/auth/login — returns 401 when no password set\n     d. POST /api/auth/login — returns 401 with wrong password\n     e. POST /api/auth/login — returns JWT with correct password\n     f. POST /api/auth/set-password — sets password via token\n     g. POST /api/auth/set-password — sets password via email (first time)\n     h. POST /api/auth/set-password — rejects if password already set (email path)\n     i. GET /api/auth/lookup — returns user info for existing email\n     j. GET /api/auth/lookup — returns {exists: false} for unknown email\n     k. GET /api/auth/me — returns user when authenticated\n     l. PUT /api/auth/profile — updates name/photo when password valid\n   - Use the existing test setup pattern (supertest, mongodb-memory-server if used, or whatever the existing tests use)\n   - Create test users with email instead of phone\n\n2. Edit server/__tests__/admin.test.js:\n   - Remove any phone-allowlist-based admin auth tests\n   - Keep password-based admin login tests\n   - Update any assertions that reference phone field to use email\n\n3. Edit server/__tests__/rsvp.test.js:\n   - Update user creation in test setup: use email field instead of phone\n   - Add test: POST /api/rsvps with email field auto-creates user and returns token\n   - Update any phone references in assertions to email\n   - Keep guest RSVP tests (no email, no auth) unchanged\n\nMatch existing test patterns (describe/it blocks, assertion style, setup/teardown). Return when all test files are saved."
)
```

### Phase 7: Cleanup old files + env (sequential, after Phase 6)

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Remove old auth code and update env",
  prompt="In the barbecue-mondays project:\n\n1. Delete these files (they are replaced by RSVPFormUnified):\n   - client/src/components/GuestRSVPForm.jsx\n   - client/src/components/RSVPForm.jsx\n   - client/src/components/LoginModal.jsx (if it exists)\n\n2. Update .env.example:\n   - Remove these lines: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID, DEFAULT_COUNTRY_CODE, ADMIN_PHONES\n   - Add: VITE_CLOUDINARY_MEDIA_UPLOAD_PRESET=barbecue_mondays_media\n   - Keep all other variables\n\n3. Check if server/package.json has 'twilio' as a dependency. If so, run `npm uninstall twilio` in the server/ directory.\n\n4. Remove any remaining imports of GuestRSVPForm, RSVPForm, or LoginModal from other files (grep for them and remove dead imports).\n\n5. Remove any remaining references to ADMIN_PHONES in server/routes/admin.js or server/routes/events.js (these should have been handled in Phase 5, but double-check).\n\nReturn when all changes are saved and lint-clean."
)
```

### Phase 8: Testing guide (can run concurrently with Phase 7 and Phase 9)

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="executor",
  description="Create manual testing guide",
  prompt="Create docs/TESTING_GUIDE.md in the barbecue-mondays project with the following manual testing scenarios. Use markdown with clear sections, checkboxes, and expected results:\n\n# Manual Testing Guide — User Auth, RSVP & Gallery\n\n## Prerequisites\n- Server running (npm run dev)\n- MongoDB connected\n- Cloudinary configured (VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET, VITE_CLOUDINARY_MEDIA_UPLOAD_PRESET)\n- Gmail API configured for sending emails (or check server logs for email content in dev)\n\n## Test Scenarios\n\n### 1. First-Time Guest RSVP (No Email)\n- Navigate to /#rsvp\n- Fill name, select food category, optionally add allergies\n- Leave email blank\n- Click RSVP\n- Expected: RSVP created as guest, form resets, no account created, no email sent\n\n### 2. First-Time RSVP with Email (Account Creation)\n- Navigate to /#rsvp\n- Fill name, enter valid email\n- Verify: email field has type=email, triggers mobile keyboard suggestions\n- Observe: optional profile photo upload appears\n- Select food, add allergies\n- Click RSVP\n- Expected: RSVP created, account created, JWT stored in localStorage, email stored in localStorage, password-set email sent (check server logs or inbox)\n\n### 3. Returning User RSVP\n- After Test 2, refresh the page\n- Navigate to /#rsvp\n- Expected: email field pre-filled from localStorage\n- On email field blur: form transitions to returning-user state\n- Expected: summary bar shows name + profile pic (or placeholder), food + allergies fields shown\n- Fill food, click RSVP\n- Expected: RSVP created linked to existing account\n\n### 4. 'Not You?' Reset\n- In returning-user state, click 'Not you?' link\n- Expected: form resets to guest state, email cleared\n\n### 5. Set Password via Email Link\n- Copy the password-set link from email (or construct: /set-password?token=<token from server log>)\n- Navigate to that URL\n- Enter password (min 8 chars) + confirm password\n- Try mismatched passwords → Expected: validation error\n- Enter matching passwords → Submit\n- Expected: success message 'Password set successfully'\n\n### 6. Set Password via Fallback (no token)\n- Navigate to /set-password?email=<your-email>\n- If password NOT yet set: shows password form, can set password\n- If password already set: shows error 'Password already set, please use login'\n\n### 7. Profile Edit (Password Required)\n- Navigate to /profile\n- If not authenticated: shows 'Please RSVP first' message\n- If authenticated: shows profile info + Your RSVPs section + Your Uploads section\n- Click 'Edit Profile'\n- Enter wrong password → Expected: error\n- Enter correct password → Expected: edit fields appear (name, photo)\n- Change name, click save\n- Expected: profile updated, success message\n\n### 7a. Profile - Manage RSVPs\n- Navigate to /profile (authenticated)\n- Expected: 'Your RSVPs' section shows all your RSVPs with event dates and food\n- Click 'Edit' on an active RSVP → Expected: EditRSVPModal opens\n- Change food, save → Expected: RSVP updated in list\n- Click 'Cancel' on an active RSVP → Expected: confirmation prompt\n- Confirm → Expected: RSVP shows as cancelled (greyed out)\n\n### 7b. Profile - Manage Uploads\n- Navigate to /profile (authenticated, with some uploads)\n- Expected: 'Your Uploads' section shows grid of your media thumbnails\n- Click a thumbnail → Expected: GalleryModal opens with that media\n- Close modal, click delete (X) on a media item → Expected: confirmation prompt\n- Confirm → Expected: media removed from grid\n- With no uploads: Expected: 'You haven't uploaded any photos or videos yet'\n\n### 8. Edit RSVP (Logged-In User)\n- RSVP with email (Test 2) so an account is created\n- Refresh the page\n- In the RSVP list, find your RSVP\n- Expected: an 'Edit' button appears on your RSVP card\n- Click Edit\n- Expected: modal opens with food and allergies pre-filled\n- Change food selection, update allergies\n- Click 'Save Changes'\n- Expected: modal closes, RSVP list refreshes with updated food/allergies\n\n### 9. Cancel RSVP (Logged-In User)\n- After Test 8, click Edit on your RSVP again\n- Click 'Cancel my RSVP'\n- Expected: confirmation prompt appears\n- Confirm cancellation\n- Expected: modal closes, your RSVP disappears from the list\n\n### 10. Edit Button Not Shown for Others' RSVPs\n- Log in as user A, RSVP\n- View RSVP list\n- Expected: Edit button only on your own RSVP, not on others'\n\n### 11. Media Upload (Auth Required)\n- Navigate to /upload without being logged in\n- Expected: message saying login required, link to /#rsvp\n- RSVP with email first (Test 2), then navigate to /upload\n- Expected: upload widget available\n- Upload a photo (< 10MB, jpg/png)\n- Expected: photo appears in 'uploaded this session' list\n- Upload a video (< 100MB, mp4)\n- Expected: video appears with thumbnail\n\n### 12. Gallery View (Public)\n- Navigate to /gallery without logging in\n- Expected: page loads, shows all uploaded media in grid\n- Click a photo → Expected: modal opens with enlarged photo, poster name + pic at bottom\n- Click a video → Expected: modal opens with video player, poster info\n- Press Escape or click overlay → Expected: modal closes\n- If more than 20 items: 'Load More' button appears and works\n\n### 13. Gallery Empty State\n- With no media in database, navigate to /gallery\n- Expected: 'No photos or videos yet' message\n\n### 14. Email Field Mobile UX\n- Open /#rsvp on mobile (or mobile emulator)\n- Tap email field\n- Expected: email keyboard appears (with @ symbol visible), autofill suggestions shown\n\n### 15. Navigation\n- Check Header: 'Gallery' link visible to all users\n- Check Header: 'Upload' link visible to all users (page itself gates auth)\n- All nav links work and load correct pages\n\n### 16. Edge Cases\n- RSVP with email that already has an account + password: should still work, no new password email sent\n- Very long name (100+ chars): should be trimmed/handled\n- Invalid email format: client-side validation prevents submit\n- Expired password token: shows error on /set-password\n- Upload page with Cloudinary not configured: shows disabled state message\n\n## Smoke Test Checklist\n- [ ] Server starts without errors\n- [ ] Home page loads\n- [ ] RSVP form renders\n- [ ] Gallery page loads (empty state OK)\n- [ ] Upload page shows auth gate when not logged in\n- [ ] /set-password page renders\n- [ ] /profile page renders\n- [ ] No console errors on any page\n- [ ] API /health returns 200\n\nReturn when the file is saved."
)
```

### Phase 9: Run automated tests (sequential, after Phase 7)

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="test-runner",
  description="Run server and client tests",
  prompt="In the barbecue-mondays project:\n\n1. Run server tests: cd server && npm test\n   - If tests fail, analyze failures and fix them.\n   - Common issues: stale phone references, missing imports, changed API contracts.\n\n2. Run client lint: cd client && npm run lint (if script exists)\n   - Fix any lint errors in new/modified files.\n\n3. Run root lint if available: npm run lint (from project root)\n\nReturn the test results summary: how many passed, how many failed, and what fixes were applied."
)
```

### Phase 10: Verification (final gate, sequential after all above)

<!-- plan-execution: verbatim-prompt -->
```
Task(
  subagent_type="verifier",
  description="Verify full implementation",
  prompt="Verify the barbecue-mondays project implementation of user auth, unified RSVP, and media gallery:\n\n1. Check all new files exist (use ls or glob):\n   - server/models/Media.js\n   - server/routes/media.js\n   - client/src/components/RSVPFormUnified.jsx\n   - client/src/components/EditRSVPModal.jsx\n   - client/src/components/MediaUpload.jsx\n   - client/src/components/GalleryModal.jsx\n   - client/src/pages/SetPassword.jsx\n   - client/src/pages/Upload.jsx\n   - client/src/pages/Gallery.jsx\n   - client/src/pages/Profile.jsx\n   - client/src/pages/CreateAccount.jsx\n   - docs/TESTING_GUIDE.md\n\n2. Check modified files have correct changes (read key sections):\n   - server/models/User.js has email field (not phone as required)\n   - server/routes/auth.js has register/login/set-password/lookup/profile endpoints (no Twilio imports)\n   - server/middleware/auth.js uses email in JWT payload\n   - server/middleware/adminAuth.js does NOT reference phone or ADMIN_PHONES\n   - server/middleware/adminTokenAuth.js does NOT reference phone or ADMIN_PHONES\n   - server/services/emailService.js has sendPasswordSetEmail method\n   - server/server.js mounts /api/media\n   - server/routes/rsvp.js accepts email field and auto-creates users\n   - server/routes/events.js populates email not phone\n   - server/routes/admin.js populates email not phone\n   - client/src/App.jsx has routes: /set-password, /upload, /gallery, /profile, /create-account\n   - client/src/api/client.js has register/login/setPassword/lookupUser/uploadMedia/getMedia methods, no sendOtp/verifyOtp\n   - client/src/context/AuthContext.jsx stores email in localStorage\n   - client/src/pages/Home.jsx imports RSVPFormUnified (not GuestRSVPForm) and EditRSVPModal\n   - client/src/components/RSVPCard.jsx has isOwner and onEdit props\n   - client/src/components/Header.jsx has Gallery and Upload links plus user avatar when authenticated\n   - server/routes/rsvp.js PUT schema includes allergies field\n   - server/routes/events.js RSVP serialization includes userId field\n\n3. Check deleted files don't exist:\n   - client/src/components/GuestRSVPForm.jsx should be gone\n   - client/src/components/RSVPForm.jsx should be gone\n   - client/src/components/LoginModal.jsx should be gone\n\n4. Run linter concretely:\n   - cd client && npx eslint src/ --ext .js,.jsx (or npm run lint if script exists)\n   - cd server && npx eslint . --ext .js (or npm run lint if script exists)\n\n5. Check for dead imports: grep -r 'GuestRSVPForm\\|LoginModal\\|sendOtp\\|verifyOtp\\|TWILIO\\|ADMIN_PHONES' across client/src/ and server/ (should return nothing)\n\n6. Check .env.example: grep for TWILIO (should be gone), grep for VITE_CLOUDINARY_MEDIA_UPLOAD_PRESET (should exist)\n\n7. Verify server has no syntax errors: cd server && node --check server.js\n\n8. Check that bcrypt is in server/package.json dependencies: grep bcrypt server/package.json\n\n9. Quick smoke: cd server && npm test (should all pass after Phase 9 fixes)\n\nReport any issues found with file path and line numbers. If all checks pass, confirm the implementation is complete."
)
```
