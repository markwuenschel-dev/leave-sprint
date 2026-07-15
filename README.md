# Waypoint (+ Leave Sprint Twin)

**Waypoint** is the active product: a **local-first career transition hub** (phase B readiness → phase A applications).

**Leave Sprint Twin** (repo root `app/`, `lib/`) is **frozen scaffolding** — not the daily driver.

> Always use **pnpm**.

## Quick start (Waypoint)

```bash
pnpm install
pnpm dev          # http://localhost:3210 — apps/waypoint (prod still serves on 3000)
pnpm build
pnpm start        # migrate PGlite + next start (local)
```

Data lives in embedded **PGlite** under `apps/waypoint/.pglite` (no cloud host required).

Optional: set `APP_TOKEN` for a cookie gate; unset = open.

### Deploy on AWS EC2 (Node)

Local-first still means **your** server — EC2 is fine. Not Railway.

1. Instance: Amazon Linux 2023 or Ubuntu, security group **inbound 80/443** (and 22 for SSH). App can listen on **3000** behind nginx.
2. Install **Node 22+**, **pnpm**, git. Clone repo.
3. On the box:

```bash
pnpm install
pnpm --filter waypoint build
# durable PGlite dir (persist across restarts — use a real path on the instance disk)
export WAYPOINT_PGLITE_DIR=/var/lib/waypoint/pglite
export APP_TOKEN='strong-secret'   # optional but recommended on a public IP
mkdir -p "$WAYPOINT_PGLITE_DIR"
pnpm --filter waypoint start       # binds 0.0.0.0; PORT defaults 3000
```

4. Put **nginx** (or Caddy) in front: proxy `http://127.0.0.1:3000`, TLS via ACM/Let’s Encrypt.
5. **systemd** unit example (user `ubuntu`, adjust paths):

```ini
[Unit]
Description=Waypoint
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/leave-sprint
Environment=NODE_ENV=production
Environment=WAYPOINT_PGLITE_DIR=/var/lib/waypoint/pglite
Environment=APP_TOKEN=change-me
Environment=PORT=3000
ExecStart=/usr/bin/pnpm --filter waypoint start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

6. Open the app: `https://your-host/?token=APP_TOKEN` once if gated.

**Note:** PGlite is single-node file DB — fine for one EC2. Back up `/var/lib/waypoint/pglite` (or use **More → Export JSON**). Multi-instance load balancing needs a different DB story later.

### Monorepo layout

```
apps/waypoint/           # Waypoint Next app
packages/rubric/         # @waypoint/rubric
packages/qbank/          # @waypoint/qbank
packages/practice-types/ # @waypoint/practice-types
app/, lib/, data/        # Leave Sprint Twin (frozen)
```

### Twin (optional)

```bash
pnpm dev:twin     # port 3001
pnpm build:twin
```

## Waypoint surfaces

| Nav | Purpose |
|-----|---------|
| **Today** | Daily checklist: Practice · Defense · Interview reps · Admin light |
| **Readiness** | Hybrid evidence floor (both primaries) + phase B→A go/no-go |
| **Practice** | Problem bank / solidity |
| **Defense** | File & story defense |
| **Interview** | Q bank + quick rubric log |
| **Applications** | Role+company pipeline |
| **Weekly** | Weekly review |
| **More** | Export/import JSON, about |

Role filter (All / SWE / MLE) is in the header.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind 4
- Zustand + `/api/state` → PGlite (Drizzle)
- Shared packages for rubric engine + qbank content

## Decisions

Product decisions live under `.scratch/career-transition-hub/` (wayfinder map + decision pack). Domain glossary: `CONTEXT.md`.
