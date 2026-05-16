# Final Submission Checklist - NoteSpace

Use this checklist before creating the final ZIP and recording the demo.

## Local Run

- [ ] Run `.\start-db.bat`.
- [ ] Run `.\init-db.bat`.
- [ ] Run backend: `cd backend && npm install && npm run dev`.
- [ ] Run frontend: `cd frontend && npm install && npm run dev`.
- [ ] Open `http://localhost:5173`.
- [ ] Confirm frontend build passes: `cd frontend && npm run build`.

## Demo Accounts

- [ ] Register `user1@example.com` with password `Password123!`.
- [ ] Register `user2@example.com` with password `Password123!`.
- [ ] Use one normal browser window and one private/incognito window for sharing and realtime collaboration.

## 28 Criteria To Show In Demo

- [ ] 1. Registration uses only email, display name, password, confirm password.
- [ ] 2. Registration auto-login and activation email/banner/resend.
- [ ] 3. Login, logout, and protected route behavior.
- [ ] 4. Forgot/reset password; manual login after reset.
- [ ] 5. View profile with display name, email, avatar, verification status.
- [ ] 6. Edit display name and avatar.
- [ ] 7. Change account password with current password.
- [ ] 8. User Preferences: theme, note font size, default note color.
- [ ] 9. List view.
- [ ] 10. Grid view as default.
- [ ] 11. Create note with title/content only.
- [ ] 12. Edit note in the same editor.
- [ ] 13. Delete note only after confirmation.
- [ ] 14. Auto-save and save status.
- [ ] 15. Image upload, preview, and remove.
- [ ] 16. Pin/unpin and pinned sort.
- [ ] 17. Live search by title/content.
- [ ] 18. Label add, rename, delete.
- [ ] 19. Attach/detach multiple labels.
- [ ] 20. Filter notes by label and All labels.
- [ ] 21. Enable/disable note password protection.
- [ ] 22. Unlock protected note before view/edit/delete; change note password.
- [ ] 23. Share note by registered email(s), read/edit permission, update/revoke recipients.
- [ ] 24. Realtime collaboration for edit-permission shared notes.
- [ ] 25. Polished UI/UX.
- [ ] 26. Responsive desktop/tablet/mobile layout.
- [ ] 27. PWA/offline cached app and notes.
- [ ] 28. README/Docker/local deployment readiness.

## Packaging

- [ ] Fill instructor `Rubrik.docx` with self-evaluation.
- [ ] Add public URL in rubric/README if deployed.
- [ ] Record `demo.mp4` at 1080p minimum or prepare YouTube link.
- [ ] Create final folder using required format: `id1_fullname1_id2_fullname2`.
- [ ] Include source files, `backend/schema.sql`, scripts, Docker files, README, reports.
- [ ] Exclude `node_modules/`, `frontend/dist/`, `.mariadb/`, logs, uploads, and MariaDB archives.
- [ ] ZIP file name matches the folder name.
