<div align="center">
<img src="./idocker-registry-ui/src/assets/logo.png" alt="iDocker Registry" width="400">
</div>

# iDocker Registry

> Enterprise Docker Image Registry Management Platform — Namespace / Project / Repository hierarchy, repository-level RBAC, Docker Registry v2 proxy, audit logging.

---

## Overview

iDocker Registry is an enterprise Docker image registry management platform with a Web UI. It consists of two subsystems:

- **server** — Node.js/Express REST API + Docker Registry v2 proxy
- **ui** — Vue 3 / TypeScript SPA frontend

### Key Features

| Feature | Description |
|---------|-------------|
| Three-tier hierarchy | Namespace → Project → Repository for team isolation |
| Default shared library | Built-in `default` project for base images (mysql/redis/nginx/jdk) with **single-segment path** (`idocker.vip/nginx`), visible to all users |
| Fine-grained RBAC | 4 roles (admin / project_manager / developer / operator) at repository level |
| Docker proxy | Full Docker Registry v2 API proxy with auth and audit |
| Instant sync | Tags appear right after push; newest tag auto-mirrored as `latest` |
| Audit logs | Complete operation trail with search, filter, export |
| i18n | Chinese / English bilingual UI |
| Theme | Light / Dark / Auto |

---

## Roles

| Role | Scope | Docker Permissions |
|------|-------|--------------------|
| admin | Full access: users, namespaces, projects, audit, sync | Full control |
| project_manager | Member management for all repos under a project | pull / push / delete |
| developer | Read/write repository images | pull / push / delete |
| operator | Read-only repository images | pull |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 (Composition API) + TypeScript + Vite |
| State | Pinia |
| Router | Vue Router |
| HTTP | Axios (caching, auto token injection) |
| i18n | vue-i18n (zh-CN / en-US) |
| Styling | SCSS (CSS variable theming) |
| Backend | Node.js + Express |
| Database | SQLite (WAL mode) |
| Auth | JWT + bcrypt |
| Logging | Winston |
| Docker proxy | http-proxy-middleware |

---

## Quick Start

### Development

```bash
# Install dependencies (each subsystem is independent)
cd idocker-registry-server && npm install
cd idocker-registry-ui && npm install

# Build frontend
cd idocker-registry-ui && npm run build

# Local dev: backend with nodemon (reads .env, PORT=8031)
cd idocker-registry-server && npm run dev
# Local dev: frontend Vite dev server (8030, proxies /api and /v2 to 8031)
cd idocker-registry-ui && npm run dev:client
```

> ⚠️ The previously documented `docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d`
> is **not usable**: `docker-compose.dev.yaml` does not exist in this repository (which also leaves
> `deploy/dev-entrypoint.sh` unreferenced). To verify changes inside a container, build the image first.

### Production

```bash
cd /workspace/idocker-registry
docker build -t idocker-registry:1.0.2 .   # tag declared in compose; compose has no build section
docker compose up -d
```

### Default Account

- Username: `admin`
- Password: `admin123`

---

## Pulling & Pushing Images

Login first (Web users are registry users):

```bash
docker login idocker.vip
```

### Default shared library (single-segment path)

The built-in `default` project (under the default namespace) holds shared base images (mysql / redis / nginx / jdk). These use a **single-segment name without a project layer** and are visible/pullable by every logged-in user:

```bash
docker pull idocker.vip/nginx:latest
```

Pushing base images defaults to administrators only:

```bash
docker tag nginx:latest idocker.vip/nginx:latest
docker push idocker.vip/nginx:latest
```

### Project images (two-segment path)

All other projects use `project/repository` paths:

```bash
docker pull idocker.vip/wvp/media-worker:latest
docker push idocker.vip/wvp/media-worker:latest
```

> Tags are recorded automatically right after push. When a repository has several tags, the one with the newest `created_at` is auto-mirrored as `latest`, so a plain `docker pull <repo>` always fetches the newest version.

---

## Project Structure

```
idocker-registry-server/
├── index.js                 # Entry point
├── config/
│   ├── env.js               # Environment config
│   └── database.js          # SQLite init + migration
├── middleware/
│   ├── auth.js              # JWT + role auth
│   └── errorHandler.js      # Error handling
├── models/                  # Data models (BaseModel CRUD)
├── routes/                  # API routes
├── services/                # Business logic
└── utils/                   # Utilities

idocker-registry-ui/
├── src/
│   ├── components/          # Components
│   ├── views/               # Pages (admin/ admin panel)
│   ├── stores/              # Pinia stores
│   ├── services/            # API services
│   ├── composables/         # Composables
│   ├── i18n/                # Localization
│   ├── styles/              # Global styles
│   ├── types/               # TypeScript types
│   └── utils/               # Utilities
```

---

## Environment Variables

### Backend (server/.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 7518 | Server port |
| `DB_PATH` | /app/data/registry.db | Database path |
| `JWT_SECRET` | - | JWT signing key |
| `JWT_EXPIRES_IN` | 24h | Token expiry |
| `DOCKER_REGISTRY_URL` | http://localhost:7519 | Internal Registry URL |
| `LOG_LEVEL` | info | Log level |

### Frontend (UI)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_REGISTRY_URL` | - | Default Registry URL |
| `VITE_THEME` | auto | Theme (light/dark/auto) |
| `VITE_TAGLIST_ORDER` | alpha-asc;num-desc | Tag sort order |
| `VITE_DELETE_IMAGES` | false | Allow image deletion |

---

## API Overview

| Endpoint | Description |
|----------|-------------|
| `/api/auth/*` | Login, register, refresh token |
| `/api/users/*` | User management (admin only) |
| `/api/namespaces/*` | Namespace CRUD |
| `/api/projects/*` | Project management |
| `/api/repository/*` | Repository & image tag management |
| `/api/audit/*` | Audit logs |
| `/api/sync/*` | Image sync |
| `/v2/*` | Docker Registry API proxy |

---

## License

MIT
