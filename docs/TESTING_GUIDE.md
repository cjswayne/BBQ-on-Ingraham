# Manual Testing Guide - User Auth, RSVP & Gallery

## Prerequisites

- [ ] Server running (`npm run dev`)
- [ ] MongoDB connected
- [ ] Cloudinary configured (`VITE_CLOUDINARY_CLOUD_NAME`, `VITE_CLOUDINARY_UPLOAD_PRESET`, `VITE_CLOUDINARY_MEDIA_UPLOAD_PRESET`)
- [ ] Gmail API configured for sending emails (or check server logs for email content in dev)

## Test Scenarios

### 1. First-Time Guest RSVP (No Email)

- [ ] Navigate to `/#rsvp`
- [ ] Fill name, select food category, optionally add allergies
- [ ] Leave email blank
- [ ] Click RSVP
- Expected Result: RSVP created as guest, form resets, no account created, no email sent

### 2. First-Time RSVP with Email (Account Creation)

- [ ] Navigate to `/#rsvp`
- [ ] Fill name, enter valid email
- [ ] Verify email field has `type="email"` and triggers mobile keyboard suggestions
- [ ] Observe optional profile photo upload appears
- [ ] Select food, add allergies
- [ ] Click RSVP
- Expected Result: RSVP created, account created, JWT stored in `localStorage`, email stored in `localStorage`, password-set email sent (check server logs or inbox)

### 3. Returning User RSVP

- [ ] After Test 2, refresh the page
- [ ] Navigate to `/#rsvp`
- [ ] Verify email field is pre-filled from `localStorage`
- [ ] On email field blur, verify form transitions to returning-user state
- [ ] Verify summary bar shows name + profile pic (or placeholder), and food + allergies fields are shown
- [ ] Fill food, click RSVP
- Expected Result: RSVP created and linked to existing account

### 4. 'Not You?' Reset

- [ ] In returning-user state, click `Not you?`
- Expected Result: Form resets to guest state and email is cleared

### 5. Set Password via Email Link

- [ ] Copy the password-set link from email (or construct `/set-password?token=<token from server log>`)
- [ ] Navigate to that URL
- [ ] Enter password (minimum 8 chars) and confirm password
- [ ] Try mismatched passwords
- Expected Result: Validation error is shown for mismatch
- [ ] Enter matching passwords and submit
- Expected Result: Success message `Password set successfully`

### 6. Set Password via Fallback (No Token)

- [ ] Navigate to `/set-password?email=<your-email>`
- [ ] If password is not yet set, verify password form is shown and can be submitted
- Expected Result: Password can be set successfully
- [ ] If password is already set, verify error state
- Expected Result: Error `Password already set, please use login`

### 7. Profile Edit (Password Required)

- [ ] Navigate to `/profile`
- [ ] If not authenticated, verify `Please RSVP first` message
- [ ] If authenticated, verify profile info + `Your RSVPs` section + `Your Uploads` section
- [ ] Click `Edit Profile`
- [ ] Enter wrong password
- Expected Result: Error is shown
- [ ] Enter correct password
- Expected Result: Edit fields appear (name, photo)
- [ ] Change name and click save
- Expected Result: Profile updates and success message appears

### 7a. Profile - Manage RSVPs

- [ ] Navigate to `/profile` while authenticated
- [ ] Verify `Your RSVPs` section shows all your RSVPs with event dates and food
- [ ] Click `Edit` on an active RSVP
- Expected Result: `EditRSVPModal` opens
- [ ] Change food and save
- Expected Result: RSVP updates in list
- [ ] Click `Cancel` on an active RSVP
- Expected Result: Confirmation prompt appears
- [ ] Confirm cancellation
- Expected Result: RSVP shows as cancelled (greyed out)

### 7b. Profile - Manage Uploads

- [ ] Navigate to `/profile` while authenticated and with some uploads
- [ ] Verify `Your Uploads` section shows a grid of media thumbnails
- [ ] Click a thumbnail
- Expected Result: `GalleryModal` opens with that media
- [ ] Close modal, click delete (`X`) on a media item
- Expected Result: Confirmation prompt appears
- [ ] Confirm delete
- Expected Result: Media is removed from grid
- [ ] With no uploads, verify empty state
- Expected Result: `You haven't uploaded any photos or videos yet`

### 8. Edit RSVP (Logged-In User)

- [ ] RSVP with email (Test 2) so an account is created
- [ ] Refresh the page
- [ ] In the RSVP list, find your RSVP
- Expected Result: `Edit` button appears on your RSVP card
- [ ] Click `Edit`
- Expected Result: Modal opens with food and allergies pre-filled
- [ ] Change food selection and update allergies
- [ ] Click `Save Changes`
- Expected Result: Modal closes and RSVP list refreshes with updated food/allergies

### 9. Cancel RSVP (Logged-In User)

- [ ] After Test 8, click `Edit` on your RSVP again
- [ ] Click `Cancel my RSVP`
- Expected Result: Confirmation prompt appears
- [ ] Confirm cancellation
- Expected Result: Modal closes and your RSVP disappears from the list

### 10. Edit Button Not Shown for Others' RSVPs

- [ ] Log in as user A and RSVP
- [ ] View RSVP list
- Expected Result: `Edit` button appears only on your own RSVP, not on others

### 11. Media Upload (Auth Required)

- [ ] Navigate to `/upload` without being logged in
- Expected Result: Message saying login is required and link to `/#rsvp`
- [ ] RSVP with email first (Test 2), then navigate to `/upload`
- Expected Result: Upload widget is available
- [ ] Upload a photo (`< 10MB`, jpg/png)
- Expected Result: Photo appears in `uploaded this session` list
- [ ] Upload a video (`< 100MB`, mp4)
- Expected Result: Video appears with thumbnail

### 12. Gallery View (Public)

- [ ] Navigate to `/gallery` without logging in
- Expected Result: Page loads and shows all uploaded media in a grid
- [ ] Click a photo
- Expected Result: Modal opens with enlarged photo and poster name + picture at bottom
- [ ] Click a video
- Expected Result: Modal opens with video player and poster info
- [ ] Press Escape or click overlay
- Expected Result: Modal closes
- [ ] If more than 20 items exist, click `Load More`
- Expected Result: Additional media loads correctly

### 13. Gallery Empty State

- [ ] With no media in database, navigate to `/gallery`
- Expected Result: `No photos or videos yet` message appears

### 14. Email Field Mobile UX

- [ ] Open `/#rsvp` on mobile device (or mobile emulator)
- [ ] Tap email field
- Expected Result: Email keyboard appears (with `@` visible) and autofill suggestions are shown

### 15. Navigation

- [ ] Check header: `Gallery` link is visible to all users
- [ ] Check header: `Upload` link is visible to all users (page itself gates auth)
- [ ] Verify all nav links work and load the correct pages
- Expected Result: Navigation is consistent for public and authenticated flows

### 16. Edge Cases

- [ ] RSVP with email that already has an account + password
- Expected Result: RSVP works, no new password email is sent
- [ ] Submit very long name (100+ chars)
- Expected Result: Name is trimmed/handled safely
- [ ] Enter invalid email format
- Expected Result: Client-side validation prevents submit
- [ ] Use expired password token
- Expected Result: Error shown on `/set-password`
- [ ] Open upload page with Cloudinary not configured
- Expected Result: Disabled state message is shown

## Smoke Test Checklist

- [ ] Server starts without errors
- [ ] Home page loads
- [ ] RSVP form renders
- [ ] Gallery page loads (empty state is acceptable)
- [ ] Upload page shows auth gate when not logged in
- [ ] `/set-password` page renders
- [ ] `/profile` page renders
- [ ] No console errors on any page
- [ ] API `/health` returns 200
