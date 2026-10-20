// Package notify sends PingMyNest email through Resend (https://resend.com).
package notify

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"strings"
	"time"
)

const resendURL = "https://api.resend.com/emails"

// DefaultFrom works without verifying a domain, but Resend then only
// delivers to the email address that owns the Resend account.
const DefaultFrom = "PingMyNest <onboarding@resend.dev>"

// Fail fast: someone is waiting on the sign-in button, and a hung email API
// shouldn't stall the poller either.
var httpClient = &http.Client{Timeout: 8 * time.Second}

type EmailSender struct {
	APIKey string
	// Senders on a domain verified in Resend. From sends sign-in links;
	// AlertsFrom sends seat alerts (falls back to From).
	From       string // e.g. "PingMyNest <login@pingmynest.lol>"
	AlertsFrom string // e.g. "PingMyNest <alerts@pingmynest.lol>"
	// FrontendURL is linked from alert emails.
	FrontendURL string
	url         string // overridden in tests
}

func NewEmailSender(apiKey, from, alertsFrom, frontendURL string) *EmailSender {
	if strings.TrimSpace(from) == "" {
		from = DefaultFrom
	}
	if strings.TrimSpace(alertsFrom) == "" {
		alertsFrom = from
	}
	return &EmailSender{APIKey: apiKey, From: from, AlertsFrom: alertsFrom, FrontendURL: strings.TrimRight(frontendURL, "/"), url: resendURL}
}

type resendEmail struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
	Text    string   `json:"text"`
	Tags    []tag    `json:"tags,omitempty"`
}

type tag struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

func (s *EmailSender) send(email resendEmail) error {
	if s.APIKey == "" {
		return fmt.Errorf("RESEND_API_KEY is not set")
	}
	if email.From == "" {
		email.From = s.From
	}
	payload, err := json.Marshal(email)
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", s.url, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		// Resend explains failures: {"statusCode":403,"message":"The yourdomain.com domain is not verified...","name":"validation_error"}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		var e struct {
			Message string `json:"message"`
			Name    string `json:"name"`
		}
		if json.Unmarshal(body, &e) == nil && e.Message != "" {
			return fmt.Errorf("resend %d %s: %s", resp.StatusCode, e.Name, e.Message)
		}
		return fmt.Errorf("resend returned status %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return nil
}

func (s *EmailSender) SendVerificationEmail(toEmail, link string) error {
	return s.send(resendEmail{
		To:      []string{toEmail},
		Subject: "Your PingMyNest sign-in link",
		HTML: `<p>Click below to sign in and start watching classes.</p>` +
			`<p><a href="` + html.EscapeString(link) + `">Sign in to PingMyNest</a></p>` +
			`<p>This link expires in 1 hour. If you didn't ask for it, ignore this email.</p>`,
		Text: "Sign in to PingMyNest: " + link + "\n\nThis link expires in 1 hour. If you didn't ask for it, ignore this email.",
		Tags: []tag{{Name: "type", Value: "verification"}},
	})
}

func (s *EmailSender) SendSeatOpenedEmail(toEmail, subject, catalogNbr, section, descr string, avail int) error {
	course := fmt.Sprintf("%s %s", subject, catalogNbr)
	seats := fmt.Sprintf("%d seat", avail)
	if avail != 1 {
		seats += "s"
	}
	searchLink := s.FrontendURL + "/search?q=" + strings.ReplaceAll(course, " ", "+")
	// every link stays on our domain; /go/soar redirects to soar.usm.edu
	soarURL := s.FrontendURL + "/go/soar"

	plain := fmt.Sprintf(
		"A seat just opened in %s section %s (%s).\n%s available right now. Register in SOAR before it fills again: %s\n\n"+
			"This watch is now off. Turn it back on from your nest if you miss it: %s/watches\n\n- PingMyNest",
		course, section, descr, seats, soarURL, s.FrontendURL,
	)
	e := html.EscapeString
	body := fmt.Sprintf(`<div style="font-family:Arial,sans-serif;max-width:520px">
<p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#8a6100;font-weight:bold">Seat open</p>
<h1 style="margin:0 0 8px;font-size:28px;color:#0a0a0a">%s &middot; %s</h1>
<p style="margin:0 0 16px;color:#3f3f46">%s<br><strong>%s</strong> available right now.</p>
<p style="margin:0 0 24px"><a href="%s" style="background:#ffc72c;color:#0a0a0a;padding:12px 20px;border-radius:4px;font-weight:bold;text-decoration:none;display:inline-block">Register in SOAR</a>
&nbsp; <a href="%s" style="color:#0a0a0a">See all %s sections</a></p>
<p style="margin:0;font-size:13px;color:#5b5b66">Seats go fast during registration. This watch is now off; turn it back on from <a href="%s/watches" style="color:#0a0a0a">your nest</a> if you miss it.</p>
</div>`, e(course), e(section), e(descr), e(seats), e(soarURL), e(searchLink), e(course), e(s.FrontendURL))

	return s.send(resendEmail{
		From:    s.AlertsFrom,
		To:      []string{toEmail},
		Subject: fmt.Sprintf("Seat open: %s §%s (%s)", course, section, seats),
		HTML:    body,
		Text:    plain,
		Tags:    []tag{{Name: "type", Value: "seat-opened"}},
	})
}
