# Deploying: Vercel (frontend) + AWS Lightsail (API, worker, database)

```
browser ──> pingmynest.lol (Vercel, Next.js)
               └── /api/* forwarded by frontend/proxy.ts ──> api.pingmynest.lol
                                                              (Lightsail: Caddy -> Go API)
            Lightsail also runs: worker (real USM poller) + postgres (not exposed)
```

- **Lightsail**: push to `main` and `.github/workflows/deploy.yml` tests
  everything, builds the api and worker images, pushes them to GHCR, then
  SSHes in to pull them, run migrations, and restart. Pull requests only run
  the tests.
- **Vercel**: deploys the frontend from the same repo on every push.
- Browsers only ever talk to `pingmynest.lol`, so session cookies stay
  first-party. There is no `replica` in production.

## Vercel

Import the GitHub repo, set **Root Directory** to `frontend`, and add env vars:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_PRODUCTION` | `true` |
| `API_UPSTREAM` | `https://api.pingmynest.lol` |
| `EDGE_SECRET` | same value as `EDGE_SECRET` in the server's `.env` |

Add the domain `pingmynest.lol` (and `www`) under Project → Domains.

## DNS

| Type | Name | Value |
|---|---|---|
| A | `@` | the IP Vercel shows under Domains (usually `76.76.21.21`) |
| CNAME | `www` | `cname.vercel-dns.com` |
| A | `api` | the Lightsail static IP |

Leave Resend's MX/TXT records alone.

## One-time setup

1. **Instance.** Lightsail → Create instance → Linux/Unix → OS only →
   **Ubuntu 24.04**, **1 GB** plan (the frontend runs on Vercel, so the
   server only runs the API, worker, Postgres, and Caddy). Add swap in step 5.
2. **Static IP.** Networking → Create static IP → attach it to the instance.
3. **Firewall.** Instance → Networking → IPv4 firewall: allow **TCP 80**,
   **TCP 443**, **UDP 443** (keep SSH 22).
4. **DNS**: the `api` record above. Caddy gets the HTTPS certificate for
   api.pingmynest.lol on its own once it resolves.
5. **Docker on the server:**
   ```sh
   ssh ubuntu@<static IP>
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker ubuntu

   # 2 GB swap: on a 1 GB plan, spikes slow down instead of getting killed
   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
   sudo mkswap /swapfile && sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-swap.conf && sudo sysctl --system
   exit   # log back in so the docker group applies
   ```
6. **Secrets on the server** (they never go in git or GitHub):
   ```sh
   mkdir -p ~/pingmynest && cd ~/pingmynest
   nano .env        # paste deploy/.env.example and fill it in
   chmod 600 .env
   ```
   Generate secrets with `openssl rand -base64 48` (`openssl rand -hex 32` for
   `EDGE_SECRET`, which also goes into Vercel). `POSTGRES_PASSWORD` must match
   the password inside `DATABASE_URL`.
7. **GitHub repository secrets** (Settings → Secrets and variables → Actions):
   - `LIGHTSAIL_HOST`: the static IP
   - `LIGHTSAIL_USER`: `ubuntu`
   - `LIGHTSAIL_SSH_KEY`: the private key (Lightsail → Account → SSH keys →
     download the default key for your region, paste the whole `.pem`)
8. **Push to `main`** and watch the Actions tab. The last step checks
   `https://api.pingmynest.lol/health`.

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

Watch memory on a 1 GB plan: `free -h` and `docker stats --no-stream`. If
"available" stays under ~150 MB or swap is constantly in use, upgrade
(Lightsail → Snapshots → create a 2 GB instance from the snapshot, then move
the static IP over).


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
