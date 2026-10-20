package usm

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

// fakeUSM mimics SOAR: searches without the session cookie get a 302 to an
// HTML page; IScript_Main sets the cookie.
func fakeUSM(t *testing.T) (*httptest.Server, *int32, *int32) {
	var searches, warms int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "IScript_Main"):
			atomic.AddInt32(&warms, 1)
			http.SetCookie(w, &http.Cookie{Name: "PS_TOKEN", Value: "guest", Path: "/"})
			w.Write([]byte("<html>main</html>"))
		case strings.HasSuffix(r.URL.Path, "IScript_ClassSearch"):
			atomic.AddInt32(&searches, 1)
			if c, err := r.Cookie("PS_TOKEN"); err != nil || c.Value != "guest" {
				http.Redirect(w, r, "/login", http.StatusFound)
				return
			}
			w.Header().Set("Content-Type", "application/json; CHARSET=UTF-8")
			w.Write([]byte(`{"pageCount":1,"classes":[{"class_nbr":2804,"subject":"MAT","catalog_nbr":"167","class_section":"H002","descr":"Calculus I","enrollment_available":3,"class_capacity":60,"meetings":[{"days":"TuTh","start_time":"09.30.00.000000","end_time":"10.45.00.000000"}],"instructors":[{"name":"Ching-Shyang Chen"}]}]}`))
		}
	}))
	t.Cleanup(srv.Close)
	return srv, &searches, &warms
}

func q() url.Values { return url.Values{"subject": {"MAT"}, "catalog_nbr": {"167"}} }

func TestClientWarmsSessionAndDecodes(t *testing.T) {
	srv, _, warms := fakeUSM(t)
	c := NewClient(srv.URL+"/IScript_ClassSearch", srv.URL+"/IScript_Main", "test", 0, 0)
	res, err := c.Search(context.Background(), q())
	if err != nil {
		t.Fatal(err)
	}
	if *warms != 1 || len(res.Classes) != 1 || res.Classes[0].Flatten().InstructorLast != "Chen" {
		t.Fatalf("warms=%d res=%+v", *warms, res)
	}
}

func TestClientRecoversFromExpiredSession(t *testing.T) {
	srv, _, warms := fakeUSM(t)
	c := NewClient(srv.URL+"/IScript_ClassSearch", srv.URL+"/IScript_Main", "test", 0, 0)
	c.lastWarm = time.Now() // believes it has a session, but has no cookie: like an expired one
	if _, err := c.Search(context.Background(), q()); err != nil {
		t.Fatalf("did not recover from redirect: %v", err)
	}
	if *warms != 1 {
		t.Errorf("warms = %d, want 1 (re-warm after the 302)", *warms)
	}
}

func TestClientCachesSearches(t *testing.T) {
	srv, searches, _ := fakeUSM(t)
	c := NewClient(srv.URL+"/IScript_ClassSearch", srv.URL+"/IScript_Main", "test", 0, time.Minute)
	for i := 0; i < 5; i++ {
		if _, err := c.Search(context.Background(), q()); err != nil {
			t.Fatal(err)
		}
	}
	if *searches != 1 {
		t.Errorf("USM saw %d searches for 5 identical requests, want 1", *searches)
	}
}

func TestClientSpacesRequests(t *testing.T) {
	srv, _, _ := fakeUSM(t)
	c := NewClient(srv.URL+"/IScript_ClassSearch", srv.URL+"/IScript_Main", "test", 150*time.Millisecond, 0)
	start := time.Now()
	c.Search(context.Background(), q()) // warm-up + search = 2 requests
	c.Search(context.Background(), q()) // 1 more
	if elapsed := time.Since(start); elapsed < 300*time.Millisecond {
		t.Errorf("3 requests took %v, want >= 2 gaps (300ms)", elapsed)
	}
}

func TestMockNeedsNoSession(t *testing.T) {
	mock := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "IScript_Main") {
			t.Error("warmed up against the mock")
		}
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"pageCount":1,"classes":[]}`))
	}))
	defer mock.Close()
	c := NewClient(mock.URL+"/mock-class-search", "", "test", 0, 0)
	if _, err := c.Search(context.Background(), q()); err != nil {
		t.Fatal(err)
	}
}
