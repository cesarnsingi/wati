# WA SaaS Angola

> **Production-ready WhatsApp Business SaaS platform for SMEs in Angola**
> Similar to WATI — multi-tenant, real-time inbox, CRM, campaigns, automations

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   NGINX     │  Port 80/443
                    │  (Reverse   │  Rate limiting
                    │   Proxy)    │  SSL termination
                    └──┬──────┬───┘
                       │      │
          ┌────────────▼──┐  ┌▼─────────────────┐
          │   Frontend    │  │    Backend         │
          │  React/Vite   │  │    NestJS          │  Port 4000
          │  (Nginx SPA)  │  │                   │
          └───────────────┘  │  REST  /api/v1    │
                             │  WS    /ws         │
                             │  Webhook /webhooks │
                             └──────┬────────────┘
                                    │
                    ┌───────────────┼──────────────────┐
                    │               │                  │
             ┌──────▼──────┐ ┌──────▼──────┐ ┌────────▼──────┐
             │  PostgreSQL │ │    Redis     │ │  Meta Cloud   │
             │  (Multi-    │ │  (Queue +    │ │  WhatsApp API │
             │   tenant)   │ │   Cache)     │ │               │
             └─────────────┘ └─────────────┘ └───────────────┘

Multi-tenancy: Each business is isolated by business_id on every query.
               One database, one schema — row-level isolation.
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 10 (TypeScript) |
| Database | PostgreSQL 16 + TypeORM |
| Queue | Bull + Redis |
| Real-time | Socket.io |
| Frontend | React 18 + Vite + Tailwind CSS |
| State | Zustand + React Query |
| Auth | JWT (RS256) |
| Email | — (WhatsApp only) |
| Proxy | Nginx |
| Containers | Docker + Docker Compose |

---

## Project Structure

```
wati-angola/
├── schema.sql                          # PostgreSQL schema (run once)
├── docker-compose.yml                  # Full stack orchestration
├── .env.example                        # Root env template
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── main.ts                     # Bootstrap (CORS, pipes, prefix)
│       ├── app.module.ts               # Root module
│       └── modules/
│           ├── auth/                   # JWT register + login
│           ├── businesses/             # Tenant settings, WhatsApp config
│           ├── contacts/               # CRM — CRUD, tags, search
│           ├── messages/               # Send text/template, conversation mgmt
│           │   ├── whatsapp.service.ts # Meta Cloud API client
│           │   ├── message.processor.ts# Bull queue worker
│           │   └── messages.gateway.ts # Socket.io real-time
│           ├── campaigns/              # Broadcast via Bull queue
│           ├── automations/            # Keyword triggers + action engine
│           └── webhooks/               # Inbound WhatsApp events
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   ├── nginx-spa.conf
│   └── src/
│       ├── App.tsx                     # Router + protected routes
│       ├── main.tsx
│       ├── index.css
│       ├── lib/api.ts                  # Axios client + typed helpers
│       ├── store/auth.store.ts         # Zustand auth state
│       ├── hooks/
│       │   ├── useSocket.ts            # Socket.io connection
│       │   └── useConversations.ts     # React Query hooks
│       ├── components/
│       │   ├── chat/
│       │   │   ├── ChatWindow.tsx      # Message bubbles + input
│       │   │   ├── ConversationList.tsx
│       │   │   └── ContactPanel.tsx    # Right panel CRM
│       │   └── ui/
│       │       └── Sidebar.tsx
│       └── pages/
│           ├── auth/LoginPage.tsx
│           ├── inbox/InboxPage.tsx     # Main chat UI
│           ├── contacts/ContactsPage.tsx
│           ├── campaigns/CampaignsPage.tsx
│           ├── automations/AutomationsPage.tsx
│           └── settings/SettingsPage.tsx
│
└── infra/
    └── nginx/
        └── nginx.conf                  # Reverse proxy + SSL + rate limiting
```

---

## Getting Started (Local Development)

### Prerequisites

```bash
node -v    # 20+
docker -v  # 24+
```

### 1. Clone and install

```bash
git clone <your-repo>
cd wati-angola

# Backend
cd backend
cp .env.example .env
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install
```

### 2. Start infrastructure (Postgres + Redis)

```bash
# From project root
docker compose up postgres redis -d
```

### 3. Run the database schema

```bash
# Option A — via psql
psql -h localhost -U postgres -d wati_angola -f schema.sql

# Option B — via Docker
docker compose exec postgres psql -U postgres -d wati_angola -f /docker-entrypoint-initdb.d/01-schema.sql
```

### 4. Start backend

```bash
cd backend
npm run start:dev
# → http://localhost:4000
```

### 5. Start frontend

```bash
cd frontend
npm run dev
# → http://localhost:3000
```

### 6. Register your first account

Open `http://localhost:3000` → click **Register** → create your business account.

---

## WhatsApp Cloud API Setup

### Step 1 — Create a Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new app → **Business** type
3. Add the **WhatsApp** product
4. Go to **WhatsApp → API Setup**
5. Note your **Phone Number ID** and **Temporary Access Token**

### Step 2 — Get a Permanent Token

1. Go to **Business Settings → System Users**
2. Create a system user with **admin** role
3. Add your WhatsApp app with **full_control** permission
4. Generate a token — this is your permanent access token

### Step 3 — Configure Webhook

1. In your platform, go to **Settings** and copy your **Webhook URL**
   ```
   https://yourdomain.com/api/v1/webhooks/{your-business-slug}
   ```
2. In Meta dashboard → **WhatsApp → Configuration → Webhook**
3. Set the webhook URL and paste your **Verify Token** (shown in Settings)
4. Subscribe to these fields: `messages`

### Step 4 — Save credentials in Settings

Open the Settings page in your platform and enter:
- Phone Number ID
- Permanent Access Token
- App Secret (for signature verification)

---

## Deployment (Production)

### Option A — Docker Compose (single server)

Best for DigitalOcean Droplet, Hetzner VPS, or any Ubuntu server.

```bash
# On your server
git clone <your-repo>
cd wati-angola

# Create .env from example
cp .env.example .env
nano .env   # Fill in JWT_SECRET, DB_PASS, FRONTEND_URL

# Add SSL certs
mkdir -p infra/nginx/certs
# Copy your fullchain.pem and privkey.pem to infra/nginx/certs/
# Or use Certbot: certbot certonly --standalone -d yourdomain.com

# Update domain in infra/nginx/nginx.conf
sed -i 's/yourdomain.com/your-actual-domain.com/g' infra/nginx/nginx.conf

# Start everything
docker compose up -d --build

# Check logs
docker compose logs -f backend
```

### Option B — Separate services (recommended for scale)

| Service | Recommended |
|---|---|
| Backend | Railway, Render, or EC2 |
| Frontend | Vercel or Netlify |
| PostgreSQL | Neon (serverless), Supabase, or RDS |
| Redis | Upstash (serverless) or ElastiCache |

```bash
# Backend on Railway
railway init
railway up

# Frontend on Vercel
vercel --prod
```

### Environment variables for production

```bash
# Generate a strong JWT secret
openssl rand -base64 64

# Update .env
JWT_SECRET=<output-from-above>
DB_PASS=<strong-password>
FRONTEND_URL=https://yourdomain.com
```

---

## API Reference

All routes are prefixed with `/api/v1`. Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create business + owner account |
| POST | `/auth/login` | Get JWT token |

### Conversations

| Method | Path | Description |
|---|---|---|
| GET | `/conversations` | List conversations |
| PATCH | `/conversations/:id/assign` | Assign to agent |
| PATCH | `/conversations/:id/resolve` | Resolve |

### Messages

| Method | Path | Description |
|---|---|---|
| GET | `/messages?conversationId=xxx` | List messages |
| POST | `/messages/text` | Send text message |
| POST | `/messages/template` | Send template message |

### Contacts

| Method | Path | Description |
|---|---|---|
| GET | `/contacts` | List + search + filter |
| GET | `/contacts/tags` | All tags |
| POST | `/contacts` | Create |
| PATCH | `/contacts/:id` | Update |
| POST | `/contacts/:id/tags` | Add tag |
| DELETE | `/contacts/:id/tags/:tag` | Remove tag |
| DELETE | `/contacts/:id` | Delete |

### Campaigns

| Method | Path | Description |
|---|---|---|
| GET | `/campaigns` | List |
| POST | `/campaigns` | Create |
| POST | `/campaigns/:id/launch` | Launch broadcast |
| POST | `/campaigns/:id/pause` | Pause |
| DELETE | `/campaigns/:id` | Delete |

### Automations

| Method | Path | Description |
|---|---|---|
| GET | `/automations` | List |
| POST | `/automations` | Create |
| PATCH | `/automations/:id/toggle` | Enable/disable |
| DELETE | `/automations/:id` | Delete |

### Webhooks (Meta calls these)

| Method | Path | Description |
|---|---|---|
| GET | `/webhooks/:slug` | Verify webhook |
| POST | `/webhooks/:slug` | Receive events |

---

## Automation Examples

### Welcome message on first contact

```json
{
  "name": "Welcome",
  "triggerType": "first_message",
  "triggerConfig": {},
  "actions": [
    {
      "type": "send_message",
      "delay_seconds": 0,
      "content": "Olá! Bem-vindo à nossa empresa. Como posso ajudar?"
    },
    {
      "type": "add_tag",
      "tag": "novo-contacto"
    }
  ]
}
```

### Keyword auto-reply

```json
{
  "name": "Price inquiry",
  "triggerType": "keyword",
  "triggerConfig": {
    "keywords": ["preço", "preco", "price", "custo", "quanto custa"]
  },
  "actions": [
    {
      "type": "send_message",
      "delay_seconds": 0,
      "content": "Os nossos preços estão disponíveis no nosso catálogo. Posso enviar mais informações?"
    }
  ]
}
```

---

## WhatsApp 24-Hour Window Policy

WhatsApp only allows free-form messages within **24 hours** of the last customer message. After that, you must use an approved **template message** to re-engage.

The platform handles this automatically:
- The conversation shows a **"Window open"** indicator (green dot)
- When expired, the text input is disabled with a **"Template only"** warning
- Use **POST /messages/template** to restart the conversation

---

## Scaling Notes

- **Queue workers**: The Bull queue (`messages` and `campaigns`) can be scaled horizontally — run multiple backend instances and they share the Redis queue
- **WebSockets**: For multi-instance deployments, configure Redis adapter for Socket.io:
  ```ts
  // In messages.gateway.ts — add Redis adapter
  import { createAdapter } from '@socket.io/redis-adapter';
  ```
- **Rate limits**: WhatsApp allows ~80 messages/minute per phone number. The campaign processor includes a 750ms delay between sends
- **Database**: Add `pgBouncer` for connection pooling at scale

---

## Security Checklist

- [x] JWT authentication on all routes
- [x] Business isolation — every query scoped by `businessId`
- [x] WhatsApp webhook signature verification (`X-Hub-Signature-256`)
- [x] Rate limiting on API and webhook routes (Nginx)
- [x] Passwords hashed with bcrypt (12 rounds)
- [x] Access tokens stored per-tenant (not global env vars)
- [ ] Add HTTPS in production (required by Meta for webhooks)
- [ ] Rotate JWT secret periodically
- [ ] Enable PostgreSQL SSL for remote connections

---

## License

MIT — free to use, fork, and deploy commercially.

---

```
WA SaaS Angola
Built for SMEs in Angola 🇦🇴
```
