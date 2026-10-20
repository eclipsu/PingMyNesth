#!/usr/bin/env bash
# Local dev stack: kills anything already on our ports, starts it all fresh,
# and prints where each piece runs.
#
#   scripts/dev.sh          start (or restart) everything
#   scripts/dev.sh stop     stop api, replica, and frontend (containers keep running)
#   scripts/dev.sh status   show what's up
#
# Logs and pids go to tmp/ (gitignored).
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT=$PWD
mkdir -p tmp

FRONTEND_PORT=3000
API_PORT=8080
REPLICA_PORT=8081

pid_on_port() { ss -ltnpH "sport = :$1" 2>/dev/null | grep -oP 'pid=\K[0-9]+' | sort -u || true; }

free_port() {
  local port=$1 pids
  pids=$(pid_on_port "$port")
  [ -z "$pids" ] && return
  echo "  stopping old process on :$port (pid $(echo $pids | tr '\n' ' '))"
  kill $pids 2>/dev/null || true
  for _ in $(seq 1 20); do [ -z "$(pid_on_port "$port")" ] && return; sleep 0.25; done
  kill -9 $(pid_on_port "$port") 2>/dev/null || true
}

wait_for() { # name url
  for _ in $(seq 1 90); do curl -fs -m 5 -o /dev/null "$2" && { echo "  ✓ $1"; return; }; sleep 0.5; done
  echo "  ✗ $1 did not come up; see tmp/$(echo "$1" | tr 'A-Z ' 'a-z-').log" >&2; exit 1
}

# the worker listens on no port, so track it by pid
stop_worker() {
  local pid
  pid=$(cat tmp/worker.pid 2>/dev/null || true)
  if [ -n "$pid" ] && ps -p "$pid" -o args= 2>/dev/null | grep -q "tmp/worker"; then
    echo "  stopping old worker (pid $pid)"
    kill "$pid" 2>/dev/null || true
  fi
  rm -f tmp/worker.pid
}

stop_all() {
  stop_worker
  ./replica --down >/dev/null 2>&1 || true
  free_port $REPLICA_PORT; free_port $API_PORT; free_port $FRONTEND_PORT
}

status() {
  printf "  %-6s %s\n" worker "$( [ -n "$(cat tmp/worker.pid 2>/dev/null)" ] && ps -p "$(cat tmp/worker.pid)" >/dev/null 2>&1 && echo up || echo down)"
  for p in $FRONTEND_PORT $API_PORT $REPLICA_PORT 5481 6381; do
    printf "  :%-5s %s\n" "$p" "$( [ -n "$(pid_on_port $p)$(ss -ltnH "sport = :$p" 2>/dev/null)" ] && echo up || echo down)"
  done
}

case "${1:-start}" in
  stop) stop_all; echo "stopped"; exit 0 ;;
  status) status; exit 0 ;;
  start) ;;
  *) echo "usage: scripts/dev.sh [start|stop|status]"; exit 1 ;;
esac

echo "→ postgres + redis (docker)"
docker compose up -d postgres redis >/dev/null
for _ in $(seq 1 40); do docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1 && break; sleep 0.5; done
echo "  ✓ postgres :5481  redis :6381"

echo "→ migrations"
migrate -path migrations -database "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" up 2>&1 | sed 's/^/  /'

echo "→ stopping old servers"
stop_all

echo "→ building"
go build -o replica ./cmd/replica
go build -o tmp/api ./cmd/api
go build -o tmp/worker ./cmd/worker

echo "→ starting"
./replica --watch --port $REPLICA_PORT >/dev/null
wait_for "replica (mock USM)" "http://localhost:$REPLICA_PORT/mock-class-search?subject=MAT"

setsid -f tmp/api >tmp/api.log 2>&1 < /dev/null
wait_for "api" "http://localhost:$API_PORT/health"
pid_on_port $API_PORT >tmp/api.pid

# the poller: watches -> replica -> seat-open emails
setsid -f tmp/worker >tmp/worker.log 2>&1 < /dev/null
sleep 1
pgrep -nf "^tmp/worker$" >tmp/worker.pid || { echo "  ✗ worker exited; see tmp/worker.log" >&2; exit 1; }
echo "  ✓ worker (seat poller)"

# setsid -f always forks, so the server is fully detached from this script
setsid -f npm --prefix frontend run dev -- --port $FRONTEND_PORT >tmp/frontend.log 2>&1 < /dev/null
wait_for "frontend" "http://localhost:$FRONTEND_PORT/"
pid_on_port $FRONTEND_PORT >tmp/frontend.pid
wait_for "frontend → api route" "http://localhost:$FRONTEND_PORT/api/health"

cat <<EOF

Running:
  Frontend   http://localhost:$FRONTEND_PORT        (open this)
             /api/*  →  http://localhost:$API_PORT/*   (Next rewrite, API_UPSTREAM in frontend/.env.local)
  API        http://localhost:$API_PORT        logs: tmp/api.log
             /search →  replica on :$REPLICA_PORT (DEVELOPMENT=true in .env)
  Mock USM   http://localhost:$REPLICA_PORT        logs: data/replica.log   (./replica --mutate <class_nbr> <seats>)
  Worker     polls watched sections, emails seat alerts   logs: tmp/worker.log
  Postgres   localhost:5481   Redis localhost:6381   (docker compose)

Stop with: scripts/dev.sh stop
EOF
