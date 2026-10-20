package main

import (
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"

	"github.com/oscusm/PingMyNest/internal/usm"
)

const prereqsFile = "data/prereqs.json"

// rawPrereq is what USM says about one course, saved verbatim; parsing
// happens offline in --catalog so the parser can improve without refetching.
type rawPrereq struct {
	ClassNbr     int    `json:"class_nbr"`
	Requirements string `json:"requirements"`
	Description  string `json:"description"`
}

func loadRawPrereqs() map[string]rawPrereq {
	out := map[string]rawPrereq{}
	if data, err := os.ReadFile(prereqsFile); err == nil {
		json.Unmarshal(data, &out)
	}
	return out
}

// cmdPrereqs fetches class details for one section of every populated course
// in the given subjects. It is resumable: courses already in
// data/prereqs.json are skipped, and progress is saved after each request.
func cmdPrereqs(subjects []string) {
	saved := loadRawPrereqs()

	type todo struct {
		key      string
		classNbr int
	}
	var queue []todo
	for _, subject := range subjects {
		subject = strings.ToUpper(subject)
		data, err := os.ReadFile(filepath.Join(dataDir, subject+"_ALL.json"))
		if err != nil {
			fmt.Printf("no %s_ALL.json; run `replica --populate %s` first\n", subject, subject)
			continue
		}
		var result ClassSearchResponse
		if json.Unmarshal(data, &result) != nil {
			continue
		}
		seen := map[string]bool{}
		for _, s := range result.Classes {
			key := s.Subject + " " + s.CatalogNbr
			if seen[key] {
				continue
			}
			seen[key] = true
			if _, done := saved[key]; !done {
				queue = append(queue, todo{key, s.ClassNbr})
			}
		}
	}
	sort.Slice(queue, func(i, j int) bool { return queue[i].key < queue[j].key })
	fmt.Printf("%d course(s) to fetch, %d already saved (~%d min)\n", len(queue), len(saved), len(queue)*int(requestGap.Seconds())/60+1)
	if len(queue) == 0 {
		return
	}

	c := newUSMClient()
	for i, t := range queue {
		q := url.Values{}
		q.Set("institution", "USM01")
		q.Set("term", "4271")
		q.Set("class_nbr", strconv.Itoa(t.classNbr))

		var details usm.ClassDetails
		if err := c.getJSON(usmBase+".IScript_ClassDetails?"+q.Encode(), &details); err != nil {
			fmt.Printf("[%d/%d] %s: %v (skipped)\n", i+1, len(queue), t.key, err)
			continue
		}
		saved[t.key] = rawPrereq{
			ClassNbr:     t.classNbr,
			Requirements: strings.TrimSpace(details.SectionInfo.EnrollmentInformation.EnrollRequirements),
			Description:  strings.TrimSpace(details.SectionInfo.CatalogDescr.Description),
		}
		writeJSONFile(prereqsFile, saved)
		fmt.Printf("[%d/%d] %s: %s\n", i+1, len(queue), t.key, saved[t.key].Requirements)
	}
}
