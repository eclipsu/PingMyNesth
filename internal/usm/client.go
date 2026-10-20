package usm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"sync"
	"time"
)

// USM's real endpoints. In dev, SearchURL points at the replica mock instead
// and WarmUpURL is empty (the mock has no session).
const (
	RealSearchURL = "https://soar.usm.edu/psc/guest/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearch"
	RealWarmUpURL = "https://soar.usm.edu/psc/guest/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_Main"
	// sessions last a while; re-warm proactively well before they would expire
	sessionMaxAge = 20 * time.Minute
)

// errNeedSession means USM answered with a redirect or HTML instead of JSON:
// our guest session cookie is missing or expired.
var errNeedSession = errors.New("usm: session expired")

// Client talks to USM's public class search. It keeps the guest session
// cookie USM requires (without it, searches 302 to an HTML page), spaces
// requests at least Gap apart, and caches results for CacheTTL.
type Client struct {
	SearchURL string
	WarmUpURL string // "" = no session needed (replica mock)
	UserAgent string
	Gap       time.Duration // minimum time between requests to USM
	CacheTTL  time.Duration // 0 disables the cache

	http *http.Client

	mu       sync.Mutex // serializes requests so Gap holds across goroutines
	lastReq  time.Time
	lastWarm time.Time

	cacheMu sync.Mutex
	cache   map[string]cached
}

type cached struct {
	res     *SearchResponse
	expires time.Time
}

func NewClient(searchURL, warmUpURL, userAgent string, gap, cacheTTL time.Duration) *Client {
	jar, _ := cookiejar.New(nil)
	return &Client{
		SearchURL: searchURL,
		WarmUpURL: warmUpURL,
		UserAgent: userAgent,
		Gap:       gap,
		CacheTTL:  cacheTTL,
		http: &http.Client{
			Timeout: 15 * time.Second,
			Jar:     jar,
			// a redirect means "no session"; handle it instead of following it to HTML
			CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse },
		},
		cache: map[string]cached{},
	}
}

// Search runs IScript_ClassSearch with q (subject, term, filters...).
// Responses are served from cache for CacheTTL.
func (c *Client) Search(ctx context.Context, q url.Values) (*SearchResponse, error) {
	key := q.Encode()
	if res, ok := c.fromCache(key); ok {
		return res, nil
	}

	c.mu.Lock()
	defer c.mu.Unlock()
	// another caller may have filled it while we waited for the lock
	if res, ok := c.fromCache(key); ok {
		return res, nil
	}

	if c.WarmUpURL != "" && time.Since(c.lastWarm) > sessionMaxAge {
		if err := c.warmUp(ctx); err != nil {
			return nil, err
		}
	}
	res, err := c.search(ctx, key)
	if errors.Is(err, errNeedSession) && c.WarmUpURL != "" {
		if err := c.warmUp(ctx); err != nil {
			return nil, err
		}
		res, err = c.search(ctx, key)
	}
	if err != nil {
		return nil, err
	}
	c.toCache(key, res)
	return res, nil
}

func (c *Client) search(ctx context.Context, rawQuery string) (*SearchResponse, error) {
	resp, err := c.get(ctx, c.SearchURL+"?"+rawQuery)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 && resp.StatusCode < 400 {
		return nil, errNeedSession
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("usm: unexpected status %d", resp.StatusCode)
	}
	if !strings.Contains(resp.Header.Get("Content-Type"), "json") {
		return nil, errNeedSession
	}
	var res SearchResponse
	if err := json.NewDecoder(resp.Body).Decode(&res); err != nil {
		return nil, fmt.Errorf("usm: invalid JSON: %w", err)
	}
	return &res, nil
}

func (c *Client) warmUp(ctx context.Context) error {
	resp, err := c.get(ctx, c.WarmUpURL)
	if err != nil {
		return fmt.Errorf("usm: warming up session: %w", err)
	}
	resp.Body.Close()
	c.lastWarm = time.Now()
	return nil
}

// get waits out the politeness gap, then sends the request. Callers hold c.mu.
func (c *Client) get(ctx context.Context, rawURL string) (*http.Response, error) {
	if wait := c.Gap - time.Since(c.lastReq); wait > 0 {
		select {
		case <-time.After(wait):
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	c.lastReq = time.Now()

	req, err := http.NewRequestWithContext(ctx, "GET", rawURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", c.UserAgent)
	req.Header.Set("Accept", "application/json, text/plain, */*")
	return c.http.Do(req)
}

func (c *Client) fromCache(key string) (*SearchResponse, bool) {
	if c.CacheTTL <= 0 {
		return nil, false
	}
	c.cacheMu.Lock()
	defer c.cacheMu.Unlock()
	e, ok := c.cache[key]
	if !ok || time.Now().After(e.expires) {
		return nil, false
	}
	return e.res, true
}

func (c *Client) toCache(key string, res *SearchResponse) {
	if c.CacheTTL <= 0 {
		return
	}
	c.cacheMu.Lock()
	defer c.cacheMu.Unlock()
	if len(c.cache) > 2000 { // crude bound; entries only live a minute anyway
		now := time.Now()
		for k, e := range c.cache {
			if now.After(e.expires) {
				delete(c.cache, k)
			}
		}
	}
	c.cache[key] = cached{res: res, expires: time.Now().Add(c.CacheTTL)}
}
