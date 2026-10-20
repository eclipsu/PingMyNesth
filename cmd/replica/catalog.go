package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/oscusm/PingMyNest/internal/catalog"
	"github.com/oscusm/PingMyNest/internal/prereq"
)

// cmdCatalog builds internal/catalog/catalog.json from everything populated
// in data/ plus the saved subject list. It makes no network requests.
func cmdCatalog() {
	var snap catalog.Snapshot

	if data, err := os.ReadFile(subjectsFile); err == nil {
		var subjects []usmSubject
		if err := json.Unmarshal(data, &subjects); err == nil {
			for _, s := range subjects {
				// USM formats names as "ACC - Accounting"
				name := s.Descr
				if _, after, ok := strings.Cut(s.Descr, " - "); ok {
					name = after
				}
				snap.Subjects = append(snap.Subjects, catalog.Subject{Subject: s.Subject, Name: name})
			}
		}
	} else {
		fmt.Println("note: no", subjectsFile, "yet; run `replica --subjects` to add subject names")
	}

	raw := loadRawPrereqs()
	realSubject := map[string]bool{}
	for _, s := range snap.Subjects {
		realSubject[s.Subject] = true
	}
	// drop look-alike codes such as "ALL 492H" (from "all 492H classes")
	keepReal := func(groups [][]string) [][]string {
		var out [][]string
		for _, g := range groups {
			var kept []string
			for _, code := range g {
				subject, _, _ := strings.Cut(code, " ")
				if len(realSubject) == 0 || realSubject[subject] {
					kept = append(kept, code)
				}
			}
			if len(kept) > 0 {
				out = append(out, kept)
			}
		}
		return out
	}
	withPrereqs := 0
	seen := map[string]bool{}
	// reuse catalog.Catalog's instructor merging (dedupe + subject lists)
	people, _ := catalog.LoadEmbedded()
	files, _ := os.ReadDir(dataDir)
	for _, file := range files {
		if !strings.HasSuffix(file.Name(), ".json") || !strings.Contains(file.Name(), "_") {
			continue
		}
		data, err := os.ReadFile(filepath.Join(dataDir, file.Name()))
		if err != nil {
			continue
		}
		var result ClassSearchResponse
		if json.Unmarshal(data, &result) != nil {
			continue
		}
		for _, s := range result.Classes {
			if people != nil {
				people.AddInstructor(s.InstructorFirst, s.InstructorLast, s.Subject)
			}
			key := s.Subject + " " + s.CatalogNbr
			if seen[key] || s.Descr == "" {
				continue
			}
			seen[key] = true
			course := catalog.Course{Subject: s.Subject, CatalogNbr: s.CatalogNbr, Title: s.Descr}
			if r, ok := raw[key]; ok {
				reqs := prereq.Parse(key, r.Requirements, r.Description)
				course.Prereqs, course.Coreqs = keepReal(reqs.Prereqs), keepReal(reqs.Coreqs)
				course.Requirement = r.Requirements
				if len(course.Prereqs) > 0 {
					withPrereqs++
				}
			}
			snap.Courses = append(snap.Courses, course)
		}
	}

	if people != nil {
		snap.Instructors = people.Snapshot().Instructors
	}
	writeJSONFile(catalogFile, snap)
	fmt.Printf("wrote %d subject(s), %d course(s) (%d with prerequisites), %d instructor(s) to %s\n",
		len(snap.Subjects), len(snap.Courses), withPrereqs, len(snap.Instructors), catalogFile)
}
