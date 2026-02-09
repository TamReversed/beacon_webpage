# Deploying Beacon (Railway or VPS)

The site runs as a Node.js app with **real logins**: registration, login, session cookies, and a protected dashboard.

**If the container crashes with:** `Fatal: SESSION_SECRET must be set to a strong random value in production`  
→ Add the env var in your platform (e.g. Railway: **Variables** tab): `SESSION_SECRET` = output of `openssl rand -hex 32`, then redeploy.

## Run locally

```bash
npm install
npm start
```

Open **http://localhost:3000** in your browser (do not open the HTML files directly via `file://`—the API and cookies only work when the app is served by the server).

## Environment variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default `3000`). Railway sets this automatically. |
| `SESSION_SECRET` | **Required in production.** A long random string for signing session cookies. Generate with `openssl rand -hex 32`. |
| `NODE_ENV` | Set to `production` in production. Enables secure cookies. |
| `DATABASE_PATH` | Optional. Path to SQLite file (default: `beacon.db` in project root). |

## Deploy on Railway

1. Push the repo to GitHub (or connect another source).
2. In [Railway](https://railway.app), **New Project** → **Deploy from GitHub** and select the repo.
3. Railway will detect Node and run `npm start` (from `package.json`).
4. **Before the first deploy (or to fix crashes):** open your service → **Variables** tab and add:
   - `SESSION_SECRET` = run `openssl rand -hex 32` locally and paste the result (required in production).
   - `NODE_ENV` = `production` (optional; Railway often sets this automatically).
5. Trigger a redeploy so the new variables are picked up. The SQLite file will live in the container filesystem. For persistence across deploys, add a **Volume** and set `DATABASE_PATH` to a path inside that volume (e.g. `/data/beacon.db`), or use Railway Postgres and swap the app to use Postgres instead of SQLite (code change).

## Deploy on a VPS (Ubuntu/Debian)

1. On the server, install Node 18+ (e.g. from nodejs.org or `nvm`).
2. Clone the repo and install:
   ```bash
   cd /var/www/beacon  # or your path
   git clone <your-repo> .
   npm install
   ```
3. Set env (e.g. in `~/.env` or systemd):
   ```bash
   export PORT=3000
   export SESSION_SECRET="your-long-random-secret"
   export NODE_ENV=production
   ```
4. Run with a process manager so it restarts and survives reboots.

   **Option A – systemd**

   Create `/etc/systemd/system/beacon.service`:

   ```ini
   [Unit]
   Description=Beacon web app
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/beacon
   Environment=NODE_ENV=production
   Environment=PORT=3000
   Environment=SESSION_SECRET=your-secret-here
   ExecStart=/usr/bin/node server.js
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

   Then:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable beacon
   sudo systemctl start beacon
   ```

   **Option B – PM2**

   ```bash
   npm install -g pm2
   PORT=3000 SESSION_SECRET="..." NODE_ENV=production pm2 start server.js --name beacon
   pm2 save && pm2 startup
   ```

5. Put Nginx (or Caddy) in front and proxy to `http://127.0.0.1:3000`. Use HTTPS so the session cookie is secure.

## Security checklist

- Set **SESSION_SECRET** to a long random value in production.
- Use **HTTPS** so the `secure` cookie flag works.
- Keep `beacon.db` (and the app directory) not world-writable; run the process as a dedicated user (e.g. `www-data`).

## Database

- **SQLite** file: `beacon.db` in the project root (or path from `DATABASE_PATH`). Back it up regularly on a VPS.
- Tables: `users` (id, email, password_hash, name, created_at), `sessions` (id, expires, data).
- Passwords are hashed with **bcrypt** (cost 12).

## Admin / first-run

There is no in-app way to become an administrator. After a user has registered:

1. **Make them admin:** In the project root (on the server or in a one-off run), run:
   ```bash
   node scripts/promote-user.js <their-email>
   ```
   That sets the user’s role to `admin` and plan to `pro`. They can then log in and access **/admin**.

2. **On Railway:** Use a one-off run or attach to the running container and execute the script with the user’s email so the promotion is applied to the same database the app uses.

## Content (Docs & Blog)

The **Docs** and **Blog** pages are static HTML. To change them:

1. Edit [docs.html](docs.html) and [blog.html](blog.html) (and any linked assets) in the repo.
2. Commit and push, then redeploy so the updated files are served.

There is no in-app editor for docs or blog; changes are made in the codebase and deployed.
