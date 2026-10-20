package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/oscusm/PingMyNest/internal/usm"
)

const usmBase = "https://soar.usm.edu/psc/guest/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula"
const usmUserAgent = "PingMyNest-replica/0.1 (student project)"

// requestGap spaces out real USM requests; USM asked us to keep polling minimal.
const requestGap = 5 * time.Second

type usmClient struct {
	http *http.Client
	last time.Time
}

// newUSMClient warms up a guest session (USM sets cookies on IScript_Main).
func newUSMClient() *usmClient {
	jar, _ := cookiejar.New(nil)
	c := &usmClient{http: &http.Client{Timeout: 15 * time.Second, Jar: jar}}
	resp, err := c.get(usmBase + ".IScript_Main")
	if err != nil {
		fmt.Println("error warming up session:", err)
		os.Exit(1)
	}
	resp.Body.Close()
	return c
}

func (c *usmClient) get(rawURL string) (*http.Response, error) {
	if wait := requestGap - time.Since(c.last); !c.last.IsZero() && wait > 0 {
		time.Sleep(wait)
	}
	c.last = time.Now()
	req, _ := http.NewRequest("GET", rawURL, nil)
	req.Header.Set("User-Agent", usmUserAgent)
	req.Header.Set("Accept", "application/json, text/plain, */*")
	return c.http.Do(req)
}

func (c *usmClient) getJSON(rawURL string, out any) error {
	resp, err := c.get(rawURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status %d", resp.StatusCode)
	}
	if err := json.NewDecoder(resp.Body).Decode(out); err != nil {
		return fmt.Errorf("non-JSON response (session expired or USM unavailable): %w", err)
	}
	return nil
}

// cmdPopulate saves one course (catalogNbr set) or a whole subject
// (catalogNbr empty) for every subject given, following pagination.
func cmdPopulate(subjects []string, catalogNbr string) {
	c := newUSMClient()
	failed := 0
subjects:
	for _, subject := range subjects {
		subject = strings.ToUpper(subject)
		var all []ClassSection
		for page := 1; ; page++ {
			q := url.Values{}
			q.Set("institution", "USM01")
			q.Set("term", "4271")
			q.Set("subject", subject)
			q.Set("catalog_nbr", catalogNbr)
			q.Set("session_code", "1")
			q.Set("page", strconv.Itoa(page))

			var result usm.SearchResponse
			if err := c.getJSON(usmBase+".IScript_ClassSearch?"+q.Encode(), &result); err != nil {
				// skip this subject; one bad response shouldn't sink a long run
				fmt.Printf("error fetching %s page %d: %v (skipped)\n", subject, page, err)
				failed++
				continue subjects
			}
			for _, s := range result.Classes {
				all = append(all, s.Flatten())
			}
			if page >= result.PageCount {
				break
			}
		}

		name := subject + "_" + catalogNbr
		if catalogNbr == "" {
			name = subject + "_ALL"
		}
		writeJSONFile(filepath.Join(dataDir, name+".json"), ClassSearchResponse{PageCount: 1, Classes: all})
		fmt.Printf("saved %d section(s) to %s\n", len(all), filepath.Join(dataDir, name+".json"))
	}
	if failed > 0 {
		fmt.Printf("%d subject(s) failed; rerun --populate for just those\n", failed)
		os.Exit(1)
	}
}

// cmdSubjects saves USM's subject list (code + name) from the options endpoint.
func cmdSubjects() {
	c := newUSMClient()
	var opts usmOptionsResponse
	if err := c.getJSON(usmBase+".IScript_ClassSearchOptions?institution=USM01&term=4271", &opts); err != nil {
		fmt.Println("error fetching subjects:", err)
		os.Exit(1)
	}
	writeJSONFile(subjectsFile, opts.Subjects)
	fmt.Printf("saved %d subject(s) to %s\n", len(opts.Subjects), subjectsFile)
}

func writeJSONFile(path string, v any) {
	os.MkdirAll(filepath.Dir(path), 0755)
	f, err := os.Create(path)
	if err != nil {
		fmt.Println("error creating file:", err)
		os.Exit(1)
	}
	defer f.Close()
	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	enc.Encode(v)
}
