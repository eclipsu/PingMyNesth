package main

import (
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// ---------- per-IP rate limiting, lockout, and ban ----------
//
// Every IP gets one token bucket per route class. Running a bucket dry locks
// that IP out for lockDuration (429 + Retry-After). Getting locked out
// banThreshold times within banWindow bans the IP for banDuration (403).

const (
	lockDuration = 1 * time.Minute
	banThreshold = 5
	banWindow    = 15 * time.Minute
	banDuration  = 15 * time.Minute
)

type limitClass struct {
	every time.Duration // one token refills per `every`
	burst int
}

// Expensive or abusable routes get tight buckets; cheap reads get roomy ones
// so normal browsing (several API calls per page) never trips them.
var (
	authClass    = limitClass{every: 10 * time.Second, burst: 6}        // signup, verify, refresh, logout
	searchClass  = limitClass{every: 2 * time.Second, burst: 20}        // ~30/min; each hits USM
	generalClass = limitClass{every: 500 * time.Millisecond, burst: 60} // ~120/min
)

func classFor(path string) (string, limitClass) {
	switch path {
	case "/signup", "/verify", "/refresh", "/logout":
		return "auth", authClass
	case "/search":
		return "search", searchClass
	default:
		return "general", generalClass
	}
}

type ipState struct {
	buckets     map[string]*rate.Limiter
	lastSeen    time.Time
	lockedUntil time.Time
	bannedUntil time.Time
	lockouts    []time.Time // lockouts inside the current banWindow
}

type rateLimiterStore struct {
	mu  sync.Mutex
	ips map[string]*ipState
	now func() time.Time // swappable in tests
}

func newRateLimiterStore() *rateLimiterStore {
	s := &rateLimiterStore{ips: make(map[string]*ipState), now: time.Now}
	go s.cleanupLoop()
	return s
}

type verdict int

const (
	allowed verdict = iota
	locked
	banned
)

// check decides one request and returns how long the client should wait.
func (s *rateLimiterStore) check(ip, path string) (verdict, time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := s.now()

	st, ok := s.ips[ip]
	if !ok {
		st = &ipState{buckets: map[string]*rate.Limiter{}}
		s.ips[ip] = st
	}
	st.lastSeen = now

	if now.Before(st.bannedUntil) {
		return banned, st.bannedUntil.Sub(now)
	}
	if now.Before(st.lockedUntil) {
		return locked, st.lockedUntil.Sub(now)
	}

	name, class := classFor(path)
	bucket, ok := st.buckets[name]
	if !ok {
		bucket = rate.NewLimiter(rate.Every(class.every), class.burst)
		st.buckets[name] = bucket
	}
	if bucket.AllowN(now, 1) {
		return allowed, 0
	}

	// bucket ran dry: lock out, and escalate to a ban on repeat offenses
	recent := st.lockouts[:0]
	for _, t := range st.lockouts {
		if now.Sub(t) < banWindow {
			recent = append(recent, t)
		}
	}
	st.lockouts = append(recent, now)
	if len(st.lockouts) >= banThreshold {
		st.bannedUntil = now.Add(banDuration)
		st.lockouts = nil
		return banned, banDuration
	}
	st.lockedUntil = now.Add(lockDuration)
	return locked, lockDuration
}

// cleanupLoop evicts IPs that haven't been seen in a while, so the map
// doesn't grow forever under sustained traffic from many different IPs.
func (s *rateLimiterStore) cleanupLoop() {
	ticker := time.NewTicker(10 * time.Minute)
	for range ticker.C {
		s.mu.Lock()
		now := s.now()
		for ip, st := range s.ips {
			if now.Sub(st.lastSeen) > 30*time.Minute && now.After(st.bannedUntil) {
				delete(s.ips, ip)
			}
		}
		s.mu.Unlock()
	}
}

// ---------- middleware ----------

// trustedProxyHops is how many reverse proxies sit in front of the API
// (TRUSTED_PROXY_HOPS). X-Forwarded-For is client-controlled except for the
// entries our own proxies append, so we only read the entry exactly that far
// from the right. With 0 (the default) the header is ignored entirely;
// trusting it blindly lets anyone dodge the limiter by faking an IP.
var trustedProxyHops, _ = strconv.Atoi(os.Getenv("TRUSTED_PROXY_HOPS"))

func getClientIP(r *http.Request) string {
	if trustedProxyHops > 0 {
		parts := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
		if i := len(parts) - trustedProxyHops; i >= 0 {
			if ip := strings.TrimSpace(parts[i]); ip != "" {
				return ip
			}
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func rateLimitMiddleware(store *rateLimiterStore, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		v, wait := store.check(getClientIP(r), r.URL.Path)
		if v == allowed {
			next.ServeHTTP(w, r)
			return
		}
		w.Header().Set("Retry-After", strconv.Itoa(int(wait.Round(time.Second).Seconds())))
		if v == banned {
			writeError(w, http.StatusForbidden, "too many requests, temporarily banned")
			return
		}
		writeError(w, http.StatusTooManyRequests, "rate limit exceeded, try again shortly")
	})
}

// ---------- global concurrency throttle ----------

// throttleMiddleware caps total concurrent in-flight requests server-wide,
// independent of per-IP limits, so many IPs bursting simultaneously can't
// overwhelm the server either.
func throttleMiddleware(maxConcurrent int, next http.Handler) http.Handler {
	sem := make(chan struct{}, maxConcurrent)

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
			next.ServeHTTP(w, r)
		default:
			writeError(w, http.StatusServiceUnavailable, "server busy, try again shortly")
		}
	})
}
