<div align="center">
<img src="./idocker-registry-ui/src/assets/logo.png" alt="iDocker Registry" width="360">

# iDocker Registry

**One container is all it takes — a Docker registry with a built-in web UI**

[简体中文](README.md) | [English](README.en.md)

[![Docker Hub](https://img.shields.io/badge/docker-idockervip%2Fidocker--registry-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/idockervip/idocker-registry)
[![GitHub](https://img.shields.io/badge/github-idocker%2Fidocker--registry-181717?logo=github&logoColor=white)](https://github.com/idocker/idocker-registry)
[![Homepage](https://img.shields.io/badge/home-www.idocker.vip-0aa1dd)](https://www.idocker.vip)
[![Email](https://img.shields.io/badge/email-liu.menjoy%40gmail.com-EA4335?logo=gmail&logoColor=white)](mailto:liu.menjoy@gmail.com)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

---

## Overview

iDocker Registry is a self-hosted Docker registry that adds a web UI and team permissions on top of the standard Registry v2 API, packaged as **a single container**.

Once it is running:

- Manage images with plain `docker login` / `push` / `pull` — fully compatible with the official client
- Organize images as namespace → project → repository in the browser, and grant permissions per repository
- Every login, push, delete, and permission change is recorded in the audit log
- Metadata lives in a built-in SQLite database, image layers on local disk — no external database or middleware

It is aimed at small teams, a single internal server, or anyone who wants a private image hub free of public registry rate limits and quotas.

---

## Why this one

Harbor is full-featured, but storing a handful of images shouldn't require a fleet of containers and an external database. iDocker Registry packs the everyday capabilities into **a single container**:

- **One container** — web UI, REST API, and Docker Registry in one process tree, exposing a single port
- **No external services** — SQLite and the Registry process are built in; no MySQL / PostgreSQL / Redis, no middleware
- **One command to start** — `docker run` and you're done; the compressed image is about 75 MB
- **Works out of the box** — creates the database, generates secrets, and seeds the default admin on first boot
- **Easy to move** — all state lives in three mounted directories; deleting the container loses nothing, and backup is a directory copy

If you need image signing, vulnerability scanning, or cross-datacenter replication, Harbor is still the better fit. If what you want is *a private registry with a UI and team permissions*, this is less work.

---

## Features

**Repository management**

- Namespace → Project → Repository, three levels, organized by team
- Built-in `default` project for base images (nginx / mysql / redis), pullable by everyone
- Repository-level membership, down to a single repository
- Recycle bin: deletions are recoverable, and can also be purged permanently

**Image operations**

- Full Docker Registry v2 compatibility — `docker pull` / `push` just work
- Tags appear immediately after a push, no manual sync
- The newest tag is mirrored as `latest` automatically, so `docker pull <repo>` always gets the newest build
- Base images use a single-segment path (`registry.example.com/nginx:latest`), project images use two (`registry.example.com/wvp/api:latest`)

**Administration**

- User management and role assignment
- Audit log: logins, image operations, and permission changes are recorded, with search, filtering, and export
- Chinese / English UI, three themes (light / dark / follow system)
- Can sync repository lists from an existing Registry

---

## Quick Start

```bash
# 1) Create the data directories and fix ownership (the container runs as uid 1000 — this step is required)
mkdir -p registry data logs
sudo chown -R 1000:1000 registry data logs

# 2) Run
docker run -d --name idocker-registry \
  -p 7588:7518 \
  -e IDOCKER_REGISTRY_URL=http://localhost:7588 \
  -v "$PWD/registry:/var/lib/registry" \
  -v "$PWD/data:/app/data" \
  -v "$PWD/logs:/app/logs" \
  --restart unless-stopped \
  idockervip/idocker-registry:2.0.4
```

Open `http://localhost:7588`:

```
Username: admin
Password: admin123
```

> Change the password right after the first login. Rule: at least 6 characters, and must contain at least 1 special character.

Set `IDOCKER_REGISTRY_URL` to your real public address (e.g. `https://registry.example.com`) — it determines the image paths shown in the UI and the allowed cross-origin requests.

---

## Deployment

### With compose

The repository ships a `docker-compose.yaml`. Use the official image without editing anything:

```bash
git clone https://github.com/idocker/idocker-registry.git idocker-registry && cd idocker-registry
mkdir -p registry data logs && sudo chown -R 1000:1000 registry data logs

IDOCKER_IMAGE=idockervip/idocker-registry:2.0.4 docker compose up -d
```

Or build from source (see *Development*).

### Directories

| Directory | Path in container | Contents | If lost |
|-----------|------------------|----------|---------|
| `registry` | `/var/lib/registry` | Image layers and manifests | All images |
| `data` | `/app/data` | SQLite database and secrets | Users / projects / permissions |
| `logs` | `/app/logs` | Runtime logs | Historical logs only |

**The container runs as uid 1000 (the `node` user), and bind mounts override the ownership of directories in the image.** If a directory belongs to root, the container cannot write its database and fails to start with:

```
error: Server startup failed: SQLITE_CANTOPEN: unable to open database file
```

Fix:

```bash
sudo chown -R 1000:1000 registry data logs
docker restart idocker-registry
```

Wrong ownership on `registry` breaks every push; on `data` the container won't start; on `logs` startup is interrupted too.

### Configuration

In most cases you only need `IDOCKER_REGISTRY_URL`; everything else has a default:

| Variable | Default | Description |
|----------|---------|-------------|
| `IDOCKER_REGISTRY_URL` | `http://localhost:7518` | Public base URL |
| `PORT` | `7518` | Service port |
| `DEFAULT_ADMIN_PASSWORD` | `admin123` | Only used when the database is first created |
| `JWT_EXPIRES_IN` | `24h` | Login token lifetime |
| `ALLOW_USER_REGISTRATION` | `false` | Enable self-service registration |
| `LOG_LEVEL` | `info` | Log level |
| `LOG_DIR` | `/app/logs` | Log directory |
| `DB_PATH` | `/app/data/registry.db` | Database path |

Both secrets are **generated automatically** on first start and stored under `data`, then reused on restart:

| Secret | File | Effect if lost |
|--------|------|----------------|
| JWT signing key | `data/.env` | All sessions become invalid |
| Upload signing key | `data/.registry_http_secret` | In-flight uploads fail |

Beyond `IDOCKER_REGISTRY_URL` there is normally nothing to tune. The internal registry address is fixed at `http://localhost:7519` and neither needs nor accepts configuration.

### Backup and upgrade

Stop the container and copy the whole directory:

```bash
docker compose down
sudo cp -a data data.bak-$(date +%F)
```

> The database uses WAL mode, so the newest writes may still be in `registry.db-wal`. **Do not copy `registry.db` on its own** — copy the entire directory, or stop the container first.

Upgrading is just replacing the image; the schema is brought up to date on startup:

```bash
IDOCKER_IMAGE=idockervip/idocker-registry:<new-version> docker compose up -d
```

### Reclaiming disk space

Deleting tags or repositories does not immediately free layer storage — run GC offline with the registry stopped. See [`deploy/registry-gc.md`](deploy/registry-gc.md).

### Troubleshooting startup

`docker logs` sometimes stops at `database connect success`. The real cause is in `logs/exceptions.log` — check that file first.

---

## Everyday Use

Below, `registry.example.com` stands for your deployment address.

Log in once; web credentials are Docker credentials:

```bash
docker login registry.example.com
```

### Pulling base images

Images in the `default` project carry no project segment and are pullable by every signed-in user:

```bash
docker pull registry.example.com/nginx:latest
docker pull registry.example.com/mysql:latest
```

### Project images

Everything else uses `project/repository`:

```bash
docker pull registry.example.com/wvp/api:latest
docker push registry.example.com/wvp/api:latest
```

> **Create the repository in the UI before pushing.** Non-admin users cannot create repositories implicitly by pushing — if the target repository doesn't exist, the push returns 403.

### Tagging and pushing

```bash
docker tag my-app:dev registry.example.com/wvp/api:v1.2.3
docker push registry.example.com/wvp/api:v1.2.3
```

Tags show up in the UI immediately. If the newest tag is not `latest`, the system pushes that digest again under `latest`, so `docker pull registry.example.com/wvp/api` always resolves to the newest build.

---

## Permissions

| Role | Identifier | What they can do |
|------|-----------|------------------|
| Administrator | `admin` | Everything; full control over all repositories, no membership needed |
| Project manager | `project_manager` | Manage members of the repositories they own; pull / push / delete |
| Developer | `developer` | Pull / push / delete images |
| Operator | `operator` | Read-only, pull only |

Permissions are granted per **repository**, not per project. Granting access to one repository does not extend to others in the same project.

The built-in `default` namespace and `default` project are protected: they cannot be deleted, renamed, or deactivated.

---

## Development

The backend and internal registry run in a container with the source mounted (changes restart it automatically); the frontend runs Vite on the host:

```bash
# Prepare dev data directories (first time only)
mkdir -p test/dev-registry-data test/dev-app-data test/dev-app-logs
sudo chown -R 1000:1000 test/dev-registry-data test/dev-app-data test/dev-app-logs

# Terminal 1: backend + registry (host port 8031)
docker compose -f docker-compose.dev.yaml up

# Terminal 2: frontend (8030, proxies /api and /v2 to 8031)
cd idocker-registry-ui && npm install && npm run dev:client
```

Open `http://localhost:8030`. Backend edits apply immediately; changes to `package.json` dependencies or frontend code require rebuilding the image.

### Building from source

```bash
docker build -t idocker-registry:latest .
docker compose up -d
```

The `Dockerfile` is based on the official `node:22-alpine` image, so nothing extra is needed.

### Without containers

```bash
# Backend
cd idocker-registry-server && npm install
PORT=8031 node index.js

# Frontend
cd idocker-registry-ui && npm install && npm run dev:client
```

### Checks before committing

```bash
cd idocker-registry-ui && npm run build          # includes vue-tsc type check; no artifacts on failure
cd idocker-registry-server && npm test           # backend smoke tests
node --check idocker-registry-server/routes/projects.js
```

> `npm run lint` in the frontend is currently broken: `.eslintrc.cjs` depends on `@rushstack/eslint-patch`, which isn't in `devDependencies`.
>
> The `dev` / `dev:server` / `build:server` / `start` / `init-db` scripts in `idocker-registry-ui/package.json` run `cd idocker-registry-server`, but no such subdirectory exists under the UI directory, so those scripts are inert. Only `dev:client` and `build` work.

---

## API

All `/api/*` endpoints except login require `Authorization: Bearer <token>`.

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/login` | Log in, returns a JWT |
| `GET /api/auth/profile` | Current user profile |
| `PUT /api/auth/change-password` | Change password |
| `/api/users/*` | User management (admin only) |
| `/api/namespaces/*` | Namespaces; `POST /:id/restore` restores from the recycle bin |
| `/api/projects/*` | Projects; `POST /:id/restore` restores |
| `/api/repository/*` | Repositories, tags, members; `POST /:id/restore` restores |
| `GET /api/audit/logs` | Audit logs, plus `statistics` / `actions` / `export` / `cleanup` |
| `GET /api/sync/status` | Sync status, plus `POST /all` / `POST /project/:id` / `GET /logs` |
| `/v2/*` | Docker Registry v2 API |

List endpoints accept `deleted=0|1|all` for active / recycled / all entries.

Responses are consistent:

```json
{ "success": true, "data": {} }
{ "success": false, "message": "..." }
```

Paginated responses include `pagination: { page, limit, total, totalPages, hasNextPage, hasPrevPage }`.

---

## Known Limitations

- **Single instance** — the internal registry shares the container with the backend, so there is no horizontal scaling
- **No LDAP / OAuth** — the login form has an `ldapAuth` field, but the backend doesn't implement it
- **Registration is off by default** — requires `ALLOW_USER_REGISTRATION=true`, and once enabled it needs no authentication, so be careful on the public internet
- **Node 18 build warning** — `sass@1.104` wants Node ≥ 20.19; Node 18 prints `EBADENGINE` but still builds

---

## Project Layout

```
.
├── Dockerfile                  # multi-stage: frontend → backend deps → runtime
├── docker-compose.yaml         # production deployment
├── docker-compose.dev.yaml     # development (source mounted, live reload)
├── deploy/                     # registry config, entrypoints, GC guide
├── idocker-registry-server/    # Node/Express backend
│   ├── config/                 # env, database and migrations
│   ├── models/                 # data access layer
│   ├── routes/                 # API routes
│   └── services/               # auth, Docker authorization, sync
└── idocker-registry-ui/        # Vue 3 frontend
    └── src/
        ├── views/              # pages (admin/ is the management area)
        ├── components/         # components (dialogs/ holds modals)
        ├── stores/             # Pinia
        ├── services/           # API wrappers
        ├── i18n/locales/       # zh-CN / en-US
        └── styles/             # theme variables
```

---

## Official links

| Item | URL |
|------|-----|
| Source repository | https://github.com/idocker/idocker-registry |
| Published image | [`idockervip/idocker-registry:2.0.4`](https://hub.docker.com/r/idockervip/idocker-registry) |
| Homepage | https://www.idocker.vip |

## Contributing

Issues and pull requests are welcome. Please run the checks above before submitting, and keep database migrations idempotent for older databases.

## License

MIT — see [LICENSE](LICENSE).
