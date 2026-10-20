package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

// fakeClock lets tests move time without sleeping.
type fakeClock struct{ t time.Time }

func (c *fakeClock) now() time.Time          { return c.t }
func (c *fakeClock) advance(d time.Duration) { c.t = c.t.Add(d) }

func newTestStore() (*rateLimiterStore, *fakeClock) {
	clock := &fakeClock{t: time.Date(2026, 10, 20, 12, 0, 0, 0, time.UTC)}
	return &rateLimiterStore{ips: map[string]*ipState{}, now: clock.now}, clock
}

// drain spends a class's burst so the next request trips the lock.
func drain(s *rateLimiterStore, ip, path string, n int) {
	for i := 0; i < n; i++ {
		s.check(ip, path)
	}
}

func TestBurstThenLockout(t *testing.T) {
	s, clock := newTestStore()
	drain(s, "1.1.1.1", "/signup", authClass.burst)

	if v, wait := s.check("1.1.1.1", "/signup"); v != locked || wait != lockDuration {
		t.Fatalf("over burst: got %v wait %v, want locked %v", v, wait, lockDuration)
	}
	// the lock covers every route, not just the one that tripped it
	if v, _ := s.check("1.1.1.1", "/courses"); v != locked {
		t.Errorf("locked IP reached /courses: %v", v)
	}
	// other IPs are unaffected
	if v, _ := s.check("2.2.2.2", "/signup"); v != allowed {
		t.Errorf("other IP blocked: %v", v)
	}

	clock.advance(lockDuration + time.Second)
	if v, _ := s.check("1.1.1.1", "/signup"); v != allowed {
		t.Errorf("after lock expiry + refill: %v, want allowed", v)
	}
}

func TestRepeatLockoutsBanFor15Minutes(t *testing.T) {
	s, clock := newTestStore()
	ip := "3.3.3.3"
	for i := 1; i <= banThreshold; i++ {
		drain(s, ip, "/signup", authClass.burst+1) // empty the bucket, then trip it
		v, wait := s.check(ip, "/signup")
		if i < banThreshold && v != locked {
			t.Fatalf("lockout %d: %v", i, v)
		}
		if i == banThreshold {
			// the trip itself happened inside drain; this call sees the ban
			if v != banned || wait > banDuration || wait < banDuration-time.Second {
				t.Fatalf("after %d lockouts: %v wait %v, want banned ~%v", i, v, wait, banDuration)
			}
		}
		clock.advance(lockDuration + time.Second)
	}

	clock.advance(banDuration - 2*time.Minute)
	if v, _ := s.check(ip, "/courses"); v != banned {
		t.Errorf("ban lifted early: %v", v)
	}
	clock.advance(2 * time.Minute)
	if v, _ := s.check(ip, "/courses"); v != allowed {
		t.Errorf("ban did not lift after 15 minutes: %v", v)
	}
}

func TestLockoutsOutsideWindowDontBan(t *testing.T) {
	s, clock := newTestStore()
	ip := "4.4.4.4"
	for i := 0; i < banThreshold+2; i++ {
		drain(s, ip, "/signup", authClass.burst+1)
		clock.advance(banWindow/time.Duration(banThreshold-1) + time.Minute) // spaced out
		if v, _ := s.check(ip, "/courses"); v == banned {
			t.Fatalf("banned after spaced-out lockout %d", i+1)
		}
	}
}

func TestBrowsingStaysUnderGeneralLimit(t *testing.T) {
	s, clock := newTestStore()
	// 20 page loads in two minutes, ~5 API calls each
	for page := 0; page < 20; page++ {
		for call := 0; call < 5; call++ {
			if v, _ := s.check("5.5.5.5", "/me"); v != allowed {
				t.Fatalf("page %d call %d blocked", page, call)
			}
		}
		clock.advance(6 * time.Second)
	}
}

func TestMiddlewareStatusAndRetryAfter(t *testing.T) {
	s, _ := newTestStore()
	h := rateLimitMiddleware(s, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	req := func() *httptest.ResponseRecorder {
		rec := httptest.NewRecorder()
		r := httptest.NewRequest("POST", "/signup", nil)
		r.RemoteAddr = "6.6.6.6:1234"
		h.ServeHTTP(rec, r)
		return rec
	}
	for i := 0; i < authClass.burst; i++ {
		if rec := req(); rec.Code != 200 {
			t.Fatalf("request %d: %d", i, rec.Code)
		}
	}
	rec := req()
	if rec.Code != http.StatusTooManyRequests || rec.Header().Get("Retry-After") != "60" {
		t.Errorf("got %d Retry-After=%q, want 429 / 60", rec.Code, rec.Header().Get("Retry-After"))
	}
}

func TestClientIPFromEdgeOnlyWithSecret(t *testing.T) {
	edgeSecret = "s3cret"
	defer func() { edgeSecret = "" }()
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "10.0.0.9:5555" // the Vercel server / Caddy hop
	r.Header.Set("X-PMN-Client-IP", "203.0.113.50")

	if ip := getClientIP(r); ip != "10.0.0.9" {
		t.Errorf("trusted client IP without the secret: %s", ip)
	}
	r.Header.Set("X-PMN-Edge-Secret", "wrong")
	if ip := getClientIP(r); ip != "10.0.0.9" {
		t.Errorf("trusted client IP with a wrong secret: %s", ip)
	}
	r.Header.Set("X-PMN-Edge-Secret", "s3cret")
	if ip := getClientIP(r); ip != "203.0.113.50" {
		t.Errorf("with the secret: got %s, want 203.0.113.50", ip)
	}
	r.Header.Set("X-PMN-Client-IP", "not-an-ip")
	if ip := getClientIP(r); ip != "10.0.0.9" {
		t.Errorf("accepted a malformed client IP: %s", ip)
	}
}

func TestClientIPIgnoresSpoofedForwardedFor(t *testing.T) {
	r := httptest.NewRequest("GET", "/", nil)
	r.RemoteAddr = "10.0.0.9:5555"
	r.Header.Set("X-Forwarded-For", "6.6.6.6")

	trustedProxyHops = 0
	if ip := getClientIP(r); ip != "10.0.0.9" {
		t.Errorf("hops=0 used header: %s", ip)
	}

	// one trusted proxy appends the real client; anything before it is client-supplied
	r.Header.Set("X-Forwarded-For", "6.6.6.6, 203.0.113.7")
	trustedProxyHops = 1
	defer func() { trustedProxyHops = 0 }()
	if ip := getClientIP(r); ip != "203.0.113.7" {
		t.Errorf("hops=1: got %s, want 203.0.113.7", ip)
	}
}
