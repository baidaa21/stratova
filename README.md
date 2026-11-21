# Stratova — Car Studio Management Suite

Billing, job board, inventory, expenses and analytics for **Detailing Aura** and **Aura Auto Studio**, with a combined Owner Console.

- Product cost and labour cost are stored privately and **never** appear on the customer invoice.
- Advance payments and remaining balance are tracked per invoice.
- Vehicle history is available per car number; analytics are daily / weekly / monthly.

## Architecture

| Layer | Tech |
|---|---|
| Front-end | HTML, CSS, vanilla JS (no build step) |
| Backend | Node.js 22.5+, Express, built-in `node:sqlite` |
| Auth | bcrypt-hashed passwords, JWT in an httpOnly SameSite=Strict cookie, login rate limiting |
| Roles | `brand` (own data only), `admin` (Owner Console, all brands) |
| Safety | transactional saves, revision check (409 on stale data), audit log, daily SQLite backups (14 kept) |

The front-end also runs standalone from disk (`index.html` via `file://`) using browser storage; when served by the backend it syncs to the database automatically.

## Run locally

```bash
cd server
npm install
npm start          # http://localhost:3000
npm test           # API test suite
```

Default first-start logins (change them immediately in Owner Console → Access & Data, or set the env vars below before the first start):

| Workspace | Username | Password |
|---|---|---|
| Detailing Aura | `detailing` | `aura123` |
| Aura Auto Studio | `autostudio` | `aura123` |
| Owner Console | `admin` | `admin123` |

## Configuration

See `server/.env.example`. Key variables: `PORT`, `JWT_SECRET`, `COOKIE_SECURE`, `ADMIN_PASSWORD`, `DETAILING_PASSWORD`, `AUTOSTUDIO_PASSWORD`, `DATA_DIR`.

## Deploy

**VPS (recommended):** install Node 22+, clone the repo, `cd server && npm ci --omit=dev`, run with `pm2 start server/server.js`, put Nginx in front with a Let's Encrypt certificate, and set `COOKIE_SECURE=true`.

**Docker:**
```bash
docker build -t stratova .
docker run -d -p 3000:3000 -v stratova-data:/data -e JWT_SECRET=... -e ADMIN_PASSWORD=... stratova
```

Back up `DATA_DIR` (database + `backups/`). Owner Console also offers a JSON backup download.

## API (all under `/api`, cookie-authenticated)

| Method | Path | Purpose |
|---|---|---|
| POST | `/login`, `/logout` | Sign in / out |
| GET | `/me`, `/state` | Session and full workspace data |
| PUT | `/state` | Save changed brands (revision-checked) |
| GET | `/brands/:id/summary?from&to` | Revenue, collected, outstanding, private cost, expenses, net profit |
| GET | `/brands/:id/sales?q&from&to` | Search invoices |
| GET | `/brands/:id/cars/:plate` | Vehicle history |
| GET | `/admin/backup`, `/admin/audit` | Owner only |
| POST | `/admin/wipe` | Owner only |
