# Deploying to AWS Lightsail

Push to `main` and `.github/workflows/deploy.yml` tests everything, builds the
api / worker / frontend images, pushes them to GHCR, then SSHes into the
Lightsail instance to pull them, run migrations, and restart the stack. Pull
requests only run the tests.

```
internet ──443──> Caddy ──/api/*──> api (Go)  ──> real USM class search
                    │                  │
                    └──────────> frontend (Next.js)
                                       │
             worker (Go poller) ──> postgres  (not exposed)
```

There is no `replica` in production: with `DEVELOPMENT` unset, the api and
worker call USM directly.

## One-time setup

1. **Instance.** Lightsail → Create instance → Linux/Unix → OS only →
   **Ubuntu 24.04**, the **2 GB** plan or larger (Next.js + Postgres + Go).
2. **Static IP.** Networking → Create static IP → attach it to the instance.
3. **Firewall.** Instance → Networking → IPv4 firewall: allow **TCP 80**,
   **TCP 443**, **UDP 443** (keep SSH 22).
4. **DNS** at your registrar: `A pingmynest.lol → <static IP>` and
   `A www.pingmynest.lol → <static IP>`. Leave the existing MX/TXT records
   (Resend's email records) alone. Caddy gets the HTTPS certificate on its
   own once these resolve.
5. **Docker on the server:**
   ```sh
   ssh ubuntu@<static IP>
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker ubuntu && exit   # log back in afterwards
   ```
6. **Secrets on the server** (they never go in git or GitHub):
   ```sh
   mkdir -p ~/pingmynest && cd ~/pingmynest
   nano .env        # paste deploy/.env.example and fill it in
   chmod 600 .env
   ```
   Generate secrets with `openssl rand -base64 48`. `POSTGRES_PASSWORD` must
   match the password inside `DATABASE_URL`.
7. **GitHub repository secrets** (Settings → Secrets and variables → Actions):
   - `LIGHTSAIL_HOST`: the static IP
   - `LIGHTSAIL_USER`: `ubuntu`
   - `LIGHTSAIL_SSH_KEY`: the private key (Lightsail → Account → SSH keys →
     download the default key for your region, paste the whole `.pem`)
8. **Push to `main`** and watch the Actions tab. The last step checks
   `https://pingmynest.lol/api/health`.

## Polling (the worker)

Every `POLL_INTERVAL` (default `1m`) the worker checks every watched section.
It makes one request per watched subject (per 100 sections), never faster than
one request per `USM_REQUEST_GAP` (default `5s`). So:

- up to 12 watched subjects: every section is checked once a minute
- more than that: a cycle takes `subjects × 5s`, and the next cycle starts
  right away (logged as "cycle took ... longer than POLL_INTERVAL")
- no watches: no requests to USM at all

Student searches go through a 60s cache, so a registration rush costs USM one
request per course per minute, not one per student.

## Day to day

```sh
cd ~/pingmynest
docker compose ps
docker compose logs -f worker            # SEAT OPENED / notified lines
docker compose logs -f api
docker compose exec postgres pg_dump -U pingmynest pingmynest > backup-$(date +%F).sql
```

Lightsail → Snapshots → enable automatic daily snapshots for whole-server backups.

Roll back by re-running an older successful workflow run (Actions → the run →
Re-run jobs): each deploy is pinned to its commit's image tag.
