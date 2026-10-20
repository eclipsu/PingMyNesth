package main

import (
	"net/http"
	"testing"
	"time"
)

func newTestGuard() (*signupGuard, *fakeClock) {
	clock := &fakeClock{t: time.Date(2026, 10, 20, 12, 0, 0, 0, time.UTC)}
	return &signupGuard{keys: map[string]*signupRecord{}, now: clock.now}, clock
}

func TestResendCooldown(t *testing.T) {
	g, clock := newTestGuard()
	if ok, _, _, _ := g.allow("1.1.1.1", "a@usm.edu"); !ok {
		t.Fatal("first email refused")
	}
	clock.advance(10 * time.Second)
	ok, status, _, wait := g.allow("1.1.1.1", "a@usm.edu")
	if ok || status != http.StatusTooManyRequests || wait != 20*time.Second {
		t.Fatalf("resend after 10s: ok=%v status=%d wait=%v, want 429 / 20s", ok, status, wait)
	}
	clock.advance(20 * time.Second)
	if ok, _, _, _ := g.allow("1.1.1.1", "a@usm.edu"); !ok {
		t.Fatal("resend after 30s refused")
	}
}

func TestThreeResendsThenThirtyMinuteBan(t *testing.T) {
	g, clock := newTestGuard()
	ip := "2.2.2.2"
	for i := 0; i < maxSignupEmails; i++ { // first email + 3 resends
		if ok, _, _, _ := g.allow(ip, "b@usm.edu"); !ok {
			t.Fatalf("email %d refused", i+1)
		}
		clock.advance(resendCooldown)
	}
	ok, status, _, wait := g.allow(ip, "b@usm.edu")
	if ok || status != http.StatusForbidden || wait != signupBan {
		t.Fatalf("4th resend: ok=%v status=%d wait=%v, want 403 / 30m ban", ok, status, wait)
	}
	// the ban is on the IP, whatever email it tries next
	clock.advance(29 * time.Minute)
	if ok, status, _, _ := g.allow(ip, "other@usm.edu"); ok || status != http.StatusForbidden {
		t.Fatalf("still within ban: ok=%v status=%d", ok, status)
	}
	clock.advance(2 * time.Minute)
	if ok, _, _, _ := g.allow(ip, "b@usm.edu"); !ok {
		t.Fatal("ban did not lift after 30 minutes")
	}
}

func TestOneInboxCantBeFloodedFromManyIPs(t *testing.T) {
	g, clock := newTestGuard()
	for i := 0; i < maxSignupEmails; i++ {
		ip := "9.9.9." + string(rune('1'+i))
		if ok, _, _, _ := g.allow(ip, "victim@usm.edu"); !ok {
			t.Fatalf("send %d refused", i+1)
		}
		clock.advance(resendCooldown)
	}
	if ok, status, _, _ := g.allow("9.9.9.9", "victim@usm.edu"); ok || status != http.StatusTooManyRequests {
		t.Fatalf("5th email to one inbox: ok=%v status=%d, want 429", ok, status)
	}
}

func TestOldSendsAgeOut(t *testing.T) {
	g, clock := newTestGuard()
	for i := 0; i < maxSignupEmails; i++ {
		g.allow("3.3.3.3", "c@usm.edu")
		clock.advance(resendCooldown)
	}
	clock.advance(signupWindow)
	if ok, _, _, _ := g.allow("3.3.3.3", "c@usm.edu"); !ok {
		t.Fatal("sends older than the window still counted")
	}
}
