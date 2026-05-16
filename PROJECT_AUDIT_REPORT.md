# Project Audit Report - NoteSpace

Audit date: May 13, 2026  
Source of truth: `D:\Final_WEB\Ban dich Do an Lap trinh Web.pdf` (final project requirement file)

## Summary

The project remains a Note Management Web App using React 18 + Vite, Node.js + Express, MariaDB/MySQL, JWT + bcrypt, Socket.IO, and Nodemailer. The audit found broad coverage for the 28 rubric items. During this pass, I fixed two rubric-sensitive gaps:

- Sharing now supports one or multiple recipient emails through the active `/api/shared` endpoint.
- Realtime remote edits no longer trigger a return autosave, preventing update loops.

No database engine, frontend framework, backend framework, or project topic was changed.

## 28-Requirement Audit

| ID | Requirement | Status | Evidence / File | How to Demo | Notes |
|----|-------------|--------|-----------------|-------------|-------|
| 1 | User registration with email, display name, password, confirm password; bcrypt; auto-login | Done | `frontend/src/pages/Register.jsx`, `backend/controllers/authController.js` | Register a new user and confirm it enters the app immediately. | Only the required fields are shown. |
| 2 | Account activation email; unverified users can still use app; banner until verified; resend | Done | `backend/controllers/authController.js`, `backend/services/emailService.js`, `frontend/src/pages/Dashboard.jsx`, `frontend/src/pages/Activate.jsx` | Register, view banner, resend activation, open activation link. | SMTP must be configured for real email delivery. |
| 3 | Login/logout and authenticated access | Done | `frontend/src/pages/Login.jsx`, `frontend/src/context/AuthContext.jsx`, `frontend/src/App.jsx`, `backend/middleware/authMiddleware.js` | Login, logout, try direct dashboard URL while logged out. | JWT token is stored client-side and cleared on logout. |
| 4 | Password reset via email link/OTP; manual login after reset | Done | `frontend/src/pages/PasswordReset.jsx`, `frontend/src/pages/PasswordResetConfirm.jsx`, `backend/controllers/authController.js` | Request reset, open reset link, change password, return to login. | Reset response does not auto-login. |
| 5 | View profile and avatar | Done | `frontend/src/components/ProfilePage.jsx`, `backend/controllers/userController.js` | Open profile from topbar user chip. | Shows display name, email, avatar, verification status. |
| 6 | Edit profile and avatar per user | Done | `frontend/src/components/ProfilePage.jsx`, `backend/middleware/upload.js`, `backend/controllers/userController.js` | Change display name and upload avatar. | Avatar type and size are validated. |
| 7 | Change account password | Done | `frontend/src/components/SettingsPage.jsx`, `backend/controllers/authController.js` | Open User Preferences and update password with current password. | Uses bcrypt compare and hash update. |
| 8 | User Preferences: theme, note font size, default note color per user | Done | `frontend/src/components/SettingsPage.jsx`, `backend/controllers/preferenceController.js`, `backend/schema.sql` | Change theme, font size, color, reload. | Internal route key can remain `settings`; UI says User Preferences. |
| 9 | Notes list view | Done | `frontend/src/pages/Dashboard.jsx`, `frontend/src/components/NoteList.jsx` | Click list view toggle. | Grid/list toggle is in the topbar. |
| 10 | Notes grid view default | Done | `frontend/src/pages/Dashboard.jsx` | Open the app after login. | `viewMode` defaults to `grid`. |
| 11 | Create note with title and content only required | Done | `frontend/src/components/NoteEditor.jsx`, `backend/controllers/noteController.js` | Click New Note and type title/content. | Labels, images, password, color, pin, and share are optional after first autosave. |
| 12 | Update note with same create/edit interface; owner or edit permission | Done | `frontend/src/components/NoteEditor.jsx`, `backend/controllers/noteController.js`, `backend/controllers/sharedNoteController.js` | Open an existing note and edit it. | Shared read-only users cannot edit. |
| 13 | Delete note with confirmation | Done | `frontend/src/pages/Dashboard.jsx` | Delete a note and confirm/cancel. | Protected notes prompt for password before delete in the UI. |
| 14 | Auto-save with debounce and save status | Done | `frontend/src/components/NoteEditor.jsx` | Type in editor and observe Saving/Saved/Error states. | Debounce is 600ms; no manual Save button is the primary note save mechanism. |
| 15 | Attach images; preview; remove; validate type/size | Done | `frontend/src/components/NoteEditor.jsx`, `backend/middleware/upload.js`, `backend/controllers/noteController.js` | Upload multiple images, view previews, remove one. | Images are limited to 5MB and image MIME types. |
| 16 | Pin/unpin notes; pinned first; pinned-time sort | Done | `frontend/src/pages/Dashboard.jsx`, `backend/controllers/noteController.js`, `backend/schema.sql` | Pin several notes and compare ordering. | Sort uses `pinned_at` first, then updated time. |
| 17 | Live search by title/content | Done | `frontend/src/pages/Dashboard.jsx` | Type in search input. | Search is debounced by 300ms and filters title/content. |
| 18 | Label CRUD per user; delete label keeps notes; rename updates notes | Done | `frontend/src/components/LabelsPage.jsx`, `frontend/src/components/LabelManager.jsx`, `backend/controllers/labelController.js`, `backend/schema.sql` | Add, rename, delete labels. | Rename updates label row used by associated notes. |
| 19 | Attach/detach zero, one, or multiple labels to notes | Done | `frontend/src/components/NoteEditor.jsx`, `frontend/src/components/LabelManager.jsx`, `backend/controllers/labelController.js` | Open Labels in a note and toggle labels. | Many-to-many table is `note_labels`. |
| 20 | Filter notes by label with All labels option | Done | `frontend/src/pages/Dashboard.jsx` | Use label dropdown and All labels option. | Label page can also jump to filtered notes. |
| 21 | Enable/disable note password; hash note password; confirm password | Done | `frontend/src/components/PasswordProtection.jsx`, `backend/controllers/noteProtectionController.js`, `backend/schema.sql` | Enable protection and inspect locked card state. | Password hash is stored in `notes.password_hash`. |
| 22 | Protected note prompt before view/edit/delete; change password; disable with current password | Done | `frontend/src/components/PasswordPrompt.jsx`, `frontend/src/components/PasswordProtection.jsx`, `backend/controllers/noteProtectionController.js` | Lock note, open it, change password, disable password. | Backend returns hidden content only after password verification. |
| 23 | Share/receive notes by registered email; read/edit; multiple recipients; manage recipients | Fixed | `frontend/src/components/ShareNote.jsx`, `frontend/src/components/SharedNotes.jsx`, `backend/controllers/sharedNoteController.js`, `backend/schema.sql` | Share with one email or comma-separated emails, update permission, revoke. | This audit added multi-recipient support while preserving the old single `email` payload. |
| 24 | Realtime collaboration using Socket.IO note rooms; edit-only; prevent loops | Fixed | `frontend/src/components/RealTimeCollaboration.jsx`, `frontend/src/components/NoteEditor.jsx`, `backend/controllers/collaborationController.js`, `backend/server.js` | Share with edit permission, open in two browsers, type in both. | This audit added remote-update autosave skipping to prevent bounce loops. |
| 25 | Polished, modern, consistent UI/UX | Done | `frontend/src/styles.css`, dashboard/auth/profile/settings components | Navigate app and inspect spacing, cards, alerts, icons, empty states. | Login/sidebar/topbar/search/color refresh changes are retained. |
| 26 | Responsive desktop/tablet/mobile | Done | `frontend/src/styles.css`, `frontend/src/pages/Dashboard.jsx` | Test narrow viewport/mobile devtools. | Sidebar collapses/adapts and notes grid reduces on small screens. |
| 27 | PWA/offline support | Done | `frontend/public/service-worker.js`, `frontend/public/manifest.json`, `frontend/src/services/offlineSync.js`, `frontend/src/pages/Dashboard.jsx` | Load notes online, go offline, reload/open app shell and cached notes. | Offline editing is intentionally blocked until online; cached viewing and offline indicator work. |
| 28 | Deployment/Docker/local setup readiness | Done | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `README.md`, DB scripts | Follow README or run Docker Compose. | Docker Compose was reviewed but not run in this session. |

## Submission Artifact Audit

| Artifact | Status | Notes |
|----------|--------|-------|
| `Rubrik.docx` | Missing | Instructor-provided file must be filled by the student with self-evaluation, public URL if deployed, and demo accounts. |
| `source/` package | Partial | Source exists in this workspace. Exclude `node_modules/`, `frontend/dist/`, `.mariadb/`, logs, upload files, and MariaDB archives when packaging. `.gitignore` was updated for this. |
| `demo.mp4` | Missing | Must be recorded by the student. Show all 28 criteria in the video. |
| `README.md` | Done | Includes build/run, backend/frontend/database setup, test accounts, local URL, troubleshooting, Docker, and submission notes. |
| ZIP package | Missing | Must be created by the student using the required `id1_fullname1_id2_fullname2` folder and ZIP name. |

## Files Changed In This Audit

- `.gitignore`
- `README.md`
- `backend/.dockerignore`
- `backend/controllers/sharedNoteController.js`
- `backend/services/emailService.js`
- `frontend/public/manifest.json`
- `frontend/src/components/NoteEditor.jsx`
- `frontend/src/components/ShareNote.jsx`
- `frontend/src/components/SettingsPage.jsx`
- `frontend/src/components/SharedNotes.jsx`
- `PROJECT_AUDIT_REPORT.md`
- `FINAL_CHECKLIST.md`
- `FINAL_PROJECT_REPORT.md`

## APIs Added Or Changed

- `POST /api/shared/notes/:id/share`
  - Existing payload still works: `{ "email": "receiver@example.com", "permission": "read" }`
  - Added multi-recipient payload: `{ "emails": ["receiver@example.com", "second@example.com"], "permission": "edit" }`
  - Validates registered recipients, rejects self-share, updates existing share permissions, and creates new shares.

No database schema change was required in this audit.

## Verification

Passed:

```bat
cmd /c check-db.bat
cmd /c init-db.bat
node --check backend\controllers\sharedNoteController.js
node --check backend\services\emailService.js
node --check backend\server.js
node --check backend\controllers\noteController.js
node --check backend\controllers\collaborationController.js
Invoke-RestMethod http://localhost:5000/
cd frontend
cmd /c npm run build
```

Frontend build result: passed.
Backend health result: `{"message":"Note management API is running"}`.

Not completed in this environment:

- I did not start a fresh backend process because port `5000` was already in use by an existing backend/API process, and its health endpoint responded successfully.
- Docker Compose was reviewed but not run.

## Exact Commands To Run Locally

From the project root:

```bat
.\start-db.bat
.\init-db.bat
```

Backend:

```bat
cd backend
npm install
npm run dev
```

Frontend:

```bat
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Database values for local portable MariaDB:

```env
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=<local-db-password>
DB_NAME=note_app
```

## Known Limitations

- Real activation/reset/share emails require valid SMTP settings in `backend/.env`.
- Online deployment URL is not included in this local package.
- Offline mode supports app-shell caching and cached note viewing; online connection is required for reliable create/update/delete.
- `Rubrik.docx`, `demo.mp4`, and final ZIP packaging still need to be prepared by the student.

## Suggested Demo Order

1. Register User 1 and show auto-login.
2. Show unverified banner and resend activation.
3. Open activation link and confirm banner disappears after refresh/navigation.
4. Logout and login with email/password.
5. Request password reset, open reset link, set new password, login manually.
6. Open Profile from the topbar user chip.
7. Edit display name and upload/change avatar.
8. Open User Preferences from the sidebar bottom section.
9. Change theme, note font size, default note color.
10. Change account password with current password.
11. Show grid view as default.
12. Switch to list view and back to grid.
13. Create a note using title/content in the same editor used for edits.
14. Type in the editor and show autosave status.
15. Upload multiple images, preview them, and remove one.
16. Pin/unpin notes and show pinned notes sorted first.
17. Search notes live by title/content.
18. Create, rename, and delete labels.
19. Attach/detach multiple labels on a note.
20. Filter notes by label and return to All labels.
21. Enable note password with confirmation.
22. Unlock before viewing/editing/deleting a protected note.
23. Change note password and disable protection with current password.
24. Share a note from User 1 to User 2 as read-only.
25. Login as User 2 and show Shared Notes details plus read-only behavior.
26. Change permission to edit and show User 2 can edit.
27. Open the same shared note in two browsers and show realtime updates.
28. Go offline, reload/open cached app, show offline banner and cached notes.
