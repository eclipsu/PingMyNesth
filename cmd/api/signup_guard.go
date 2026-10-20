package main

import (
	"net/http"
	"strconv"
	"sync"
	"time"
)

// Sign-in email policy: one email, then up to 3 resends, each at least 30s
// apart. Going past that bans the IP from requesting sign-in emails for
// 30 minutes. The same cooldown and cap apply per email address, so nobody
// can flood one student's inbox from many IPs.
const (
	resendCooldown  = 30 * time.Second
	maxSignupEmails = 4 // the first email + 3 resends
	signupWindow    = 30 * time.Minute
	signupBan       = 30 * time.Minute
)

type signupRecord struct {
	sends       []time.Time
	bannedUntil time.Time
}

type signupGuard struct {
	mu   sync.Mutex
	keys map[string]*signupRecord
	now  func() time.Time // swappable in tests
}

func newSignupGuard() *signupGuard {
	g := &signupGuard{keys: map[string]*signupRecord{}, now: time.Now}
	go func() {
		for range time.Tick(10 * time.Minute) {
			g.mu.Lock()
			now := g.now()
			for k, r := range g.keys {
				if now.After(r.bannedUntil) && (len(r.sends) == 0 || now.Sub(r.sends[len(r.sends)-1]) > signupWindow) {
					delete(g.keys, k)
				}
			}
			g.mu.Unlock()
		}
	}()
	return g
}

// allow decides whether ip may send another sign-in email to email. On
// refusal it returns the status to answer with, a message, and the wait.
func (g *signupGuard) allow(ip, email string) (ok bool, status int, msg string, wait time.Duration) {
	g.mu.Lock()
	defer g.mu.Unlock()
	now := g.now()

	ipRec, emailRec := g.record("ip:"+ip), g.record("email:"+email)
	if now.Before(ipRec.bannedUntil) {
		return false, http.StatusForbidden, "Too many sign-in emails. Try again later.", ipRec.bannedUntil.Sub(now)
	}
	for _, r := range []*signupRecord{ipRec, emailRec} {
		r.sends = recent(r.sends, now)
		if n := len(r.sends); n > 0 {
			if since := now.Sub(r.sends[n-1]); since < resendCooldown {
				return false, http.StatusTooManyRequests, "Wait a few seconds before resending.", resendCooldown - since
			}
		}
	}
	if len(ipRec.sends) >= maxSignupEmails {
		ipRec.bannedUntil = now.Add(signupBan)
		ipRec.sends = nil
		return false, http.StatusForbidden, "Too many sign-in emails. Try again later.", signupBan
	}
	if len(emailRec.sends) >= maxSignupEmails {
		wait := signupWindow - now.Sub(emailRec.sends[0])
		return false, http.StatusTooManyRequests, "Too many sign-in emails to this address. Try again later.", wait
	}
	ipRec.sends = append(ipRec.sends, now)
	emailRec.sends = append(emailRec.sends, now)
	return true, 0, "", 0
}

func (g *signupGuard) record(key string) *signupRecord {
	r, ok := g.keys[key]
	if !ok {
		r = &signupRecord{}
		g.keys[key] = r
	}
	return r
}

func recent(sends []time.Time, now time.Time) []time.Time {
	out := sends[:0]
	for _, t := range sends {
		if now.Sub(t) < signupWindow {
			out = append(out, t)
		}
	}
	return out
}

// writeRetry answers a refused send with the wait in both the Retry-After
// header and the body, so the page can show an exact countdown.
func writeRetry(w http.ResponseWriter, status int, msg string, wait time.Duration) {
	secs := int(wait.Round(time.Second).Seconds())
	if secs < 1 {
		secs = 1
	}
	w.Header().Set("Retry-After", strconv.Itoa(secs))
	writeJSON(w, status, map[string]any{"error": msg, "retry_after": secs})
}
