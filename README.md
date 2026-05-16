# NoteSpace

NoteSpace is a full-stack note management app with authentication, labels, images, password-protected notes, sharing, realtime collaboration, user preferences, PWA cache, email activation/password reset, and MySQL/MariaDB storage.

## Stack

- Frontend: React 18 + Vite
- Backend: Node.js + Express
- Database: MySQL/MariaDB
- Auth: JWT + bcrypt
- Realtime: Socket.IO
- Email: Nodemailer

## A. Local Development

Run these commands from the project root unless a step changes folders.

### 1. Start The Local Database

```bat
.\start-db.bat
```

The bundled portable MariaDB runs on `127.0.0.1:3307`.

### 2. Initialize The Database

```bat
.\init-db.bat
```

This imports `backend/schema.sql` into the local `note_app` database and applies safe migrations.

### 3. Start The Backend

```bat
cd backend
npm install
npm start
```

For development auto-reload:

```bat
npm run dev
```

### 4. Start The Frontend

```bat
cd frontend
npm install
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

Optional local launcher:

```bat
.\run-local.bat
```

## Local Environment Files

Create `backend/.env` from `backend/.env.example`:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
EXTRA_CLIENT_URLS=

DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=
DB_NAME=note_app

JWT_SECRET=change-this-secret
JWT_EXPIRES_IN=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=your-email@gmail.com
```

Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:5000
```

Never commit real `.env` secrets.

## B. Online Deployment Overview

Recommended deployment:

- Frontend: Vercel
- Backend: Render
- Database: Railway MySQL or another online MySQL-compatible database

Target production URLs:

- Frontend: `https://notespace.vercel.app`
- Backend: `https://notespace-backend.onrender.com`

Use your actual generated Vercel and Render URLs if they differ.

## C. Deploy Database On Railway

1. Create a Railway project.
2. Add a MySQL database.
3. Copy the Railway database variables:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
4. Import the schema.

Option A, if the provider allows creating/selecting `note_app`:

```bat
mysql -h MYSQLHOST -P MYSQLPORT -u MYSQLUSER -p < backend/schema.sql
```

Option B, recommended for Railway or providers with a fixed database name:

```bat
mysql -h MYSQLHOST -P MYSQLPORT -u MYSQLUSER -p MYSQLDATABASE < backend/schema-online.sql
```

You can also import `backend/schema-online.sql` through MySQL Workbench, TablePlus, DBeaver, or the provider SQL console while connected to the selected database.

`backend/schema-online.sql` does not create or drop databases. It only creates missing tables in the database selected by `DB_NAME`.

## D. Deploy Backend On Render

Create a Render Web Service from your GitHub repository.

Settings:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Environment variables:

```env
NODE_ENV=production
PORT=10000
CLIENT_URL=https://note-management-khaki.vercel.app
EXTRA_CLIENT_URLS=

DB_HOST=MYSQLHOST
DB_PORT=MYSQLPORT
DB_USER=MYSQLUSER
DB_PASSWORD=MYSQLPASSWORD
DB_NAME=MYSQLDATABASE

JWT_SECRET=replace-with-a-long-random-production-secret
JWT_EXPIRES_IN=7d

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
EMAIL_FROM=your-email@gmail.com
```

Notes:

- `CLIENT_URL` must match the deployed Vercel frontend URL exactly.
- Use `EXTRA_CLIENT_URLS` for comma-separated Vercel preview URLs if you want previews to call the backend.
- Gmail SMTP supports either `EMAIL_PORT=587` with `EMAIL_SECURE=false` or `EMAIL_PORT=465` with `EMAIL_SECURE=true`.
- Do not put real secrets in source code or example files.

Backend health check after deployment:

```text
https://your-backend.onrender.com/api/health
```

## E. Deploy Frontend On Vercel

Create a Vercel project from your GitHub repository.

Settings:

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

Environment variable:

```env
VITE_API_URL=https://your-backend.onrender.com
```

Production example for the target Render service:

```env
VITE_API_URL=https://notespace-backend.onrender.com
```

`frontend/vercel.json` rewrites all routes to `index.html` so React Router pages work after browser refresh.

## F. After Deployment

1. Copy the final Vercel URL.
2. Set Render `CLIENT_URL` to that exact URL.
3. Redeploy the Render backend.
4. Set Vercel `VITE_API_URL` to the final Render backend URL.
5. Redeploy the Vercel frontend.
6. Visit the frontend and test:
   - Register
   - Login
   - Create note
   - Edit note
   - Auto-save note
   - Delete note
   - Search
   - Labels
   - Profile
   - User preferences
   - Shared notes
   - Realtime collaboration
   - Forgot password/email flows if SMTP is configured

## G. Troubleshooting

CORS error:

- Check Render `CLIENT_URL`.
- Check Vercel `VITE_API_URL`.
- If using Vercel preview deployments, add the preview origin to `EXTRA_CLIENT_URLS`.
- Do not use `*` with credentials.

`ECONNREFUSED` or database connection refused:

- The backend cannot reach `DB_HOST` and `DB_PORT`.
- Confirm the online database is running and allows external connections.
- Confirm Render env vars match Railway values.

Access denied:

- `DB_USER` or `DB_PASSWORD` is wrong.
- Copy the values again from Railway.

Database not found:

- `DB_NAME` is wrong or the schema was imported into a different database.
- Import `backend/schema-online.sql` into the database named by `DB_NAME`.

Frontend blank screen:

- Open the browser console.
- Confirm `VITE_API_URL` points to the deployed backend and has no trailing path like `/api`.
- Redeploy Vercel after changing env vars.

Render sleeping:

- Free Render services may take 30-60 seconds to wake up on the first request.

Socket.IO not working:

- Confirm the frontend uses the same `VITE_API_URL` as the API.
- Confirm backend socket CORS allows the frontend origin through `CLIENT_URL` or `EXTRA_CLIENT_URLS`.
- Confirm the shared user has edit permission before testing live collaboration.

Email not sending:

- Confirm all `EMAIL_*` variables are set on Render.
- For Gmail, use an app password, not your normal account password.
- The app still runs if SMTP is not configured, but activation/reset emails will not be delivered.

## Test Accounts

No seed data is included. Register two accounts manually after local setup or deployment:

```text
Owner:
email: owner@example.com
password: Password123!

Receiver:
email: receiver@example.com
password: Password123!
```

Use Owner to create and share a note. Use Receiver in another browser or private window to test shared notes and realtime editing.

## Deployment Checklist

- `backend/schema-online.sql` imported into the online database.
- Render backend has all production environment variables.
- Render health check returns success.
- Vercel frontend has `VITE_API_URL` set to the Render backend origin.
- Render `CLIENT_URL` matches the final Vercel frontend origin.
- Realtime collaboration tested with an owner and a shared user with edit permission.
