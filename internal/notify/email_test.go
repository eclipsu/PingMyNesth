package notify

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
)

func fakeResend(t *testing.T, status int, reply string, got *map[string]any) *EmailSender {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer re_test" {
			t.Errorf("auth header = %q", r.Header.Get("Authorization"))
		}
		body, _ := io.ReadAll(r.Body)
		json.Unmarshal(body, got)
		w.WriteHeader(status)
		io.WriteString(w, reply)
	}))
	t.Cleanup(srv.Close)
	s := NewEmailSender("re_test", "", "", "http://localhost:3000")
	s.url = srv.URL
	return s
}

func TestVerificationEmailPayload(t *testing.T) {
	var got map[string]any
	s := fakeResend(t, 200, `{"id":"abc"}`, &got)
	if err := s.SendVerificationEmail("rajeev.shrestha@usm.edu", "http://localhost:3000/verify?token=t&x=1"); err != nil {
		t.Fatal(err)
	}
	if got["from"] != DefaultFrom {
		t.Errorf("from = %v", got["from"])
	}
	if to, _ := got["to"].([]any); len(to) != 1 || to[0] != "rajeev.shrestha@usm.edu" {
		t.Errorf("to = %v", got["to"])
	}
	if html, _ := got["html"].(string); !strings.Contains(html, `href="http://localhost:3000/verify?token=t&amp;x=1"`) {
		t.Errorf("link not escaped into html: %s", html)
	}
}

func TestResendErrorMessageIsSurfaced(t *testing.T) {
	var got map[string]any
	s := fakeResend(t, 403, `{"statusCode":403,"message":"The pomopal.lol domain is not verified.","name":"validation_error"}`, &got)
	err := s.SendSeatOpenedEmail("a@usm.edu", "MAT", "167", "H002", "Calculus I", 2)
	if err == nil || !strings.Contains(err.Error(), "domain is not verified") {
		t.Fatalf("err = %v", err)
	}
}

func TestAlertsUseTheAlertsSender(t *testing.T) {
	var got map[string]any
	s := fakeResend(t, 200, `{"id":"x"}`, &got)
	s.From, s.AlertsFrom = "PingMyNest <login@pingmynest.lol>", "PingMyNest <alerts@pingmynest.lol>"
	s.SendSeatOpenedEmail("a@usm.edu", "MAT", "167", "H002", "Calculus I", 2)
	if got["from"] != "PingMyNest <alerts@pingmynest.lol>" {
		t.Errorf("seat alert from = %v", got["from"])
	}
	s.SendVerificationEmail("a@usm.edu", "http://x/verify?token=t")
	if got["from"] != "PingMyNest <login@pingmynest.lol>" {
		t.Errorf("sign-in from = %v", got["from"])
	}
}

func TestAlertLinksStayOnOurDomain(t *testing.T) {
	var got map[string]any
	s := fakeResend(t, 200, `{"id":"x"}`, &got)
	s.FrontendURL = "https://pingmynest.lol"
	s.SendSeatOpenedEmail("a@usm.edu", "MAT", "101", "H009", "College Algebra", 4)
	html, _ := got["html"].(string)
	for _, href := range regexp.MustCompile(`href="([^"]+)"`).FindAllStringSubmatch(html, -1) {
		if !strings.HasPrefix(href[1], "https://pingmynest.lol/") {
			t.Errorf("link off the sending domain: %s", href[1])
		}
	}
}

func TestSeatEmailEscapesHTML(t *testing.T) {
	var got map[string]any
	s := fakeResend(t, 200, `{"id":"x"}`, &got)
	s.SendSeatOpenedEmail("a@usm.edu", "MAT", "167", "H002", "<b>Calc</b>", 1)
	if html, _ := got["html"].(string); strings.Contains(html, "<b>Calc</b>") {
		t.Errorf("course title not escaped: %s", html)
	}
}
