// Package prereq turns USM's free-text enrollment requirements into
// structured course requirements.
//
// Requirements are in conjunctive form: every group must be satisfied, and a
// group is satisfied by any one of its courses. "CSC 101 and (MAT 101 or
// MAT 103)" becomes [[CSC 101] [MAT 101 MAT 103]].
package prereq

import (
	"regexp"
	"strings"
)

type Requirements struct {
	Prereqs [][]string `json:"prereqs,omitempty"`
	Coreqs  [][]string `json:"coreqs,omitempty"`
}

var (
	// grade/consent phrases contain "or" that isn't a course alternative
	noise = []*regexp.Regexp{
		regexp.MustCompile(`(?i)\b(a\s+)?(minimum\s+)?(grade\s+of\s+)?["']?[A-F][+-]?["']?\s*(grade\s+)?or\s+(better|higher|above)(\s+in)?\b`),
		regexp.MustCompile(`(?i)\bor\s+(permission|consent|approval)\s+of\s+[a-z ]+`),
		regexp.MustCompile(`(?i)\bor\s+(equivalent|instructor permission|department approval)\b`),
	}
	// "Prerequisite(s):", "PRE-REQUISITES:", "Corequisite (s):", "Prerequisite for Writing Intensive Courses:"
	header = regexp.MustCompile(`(?i)\b(pre|co)-?\s*requisites?(\s*\(s\))?(\s+for\s[^:]*)?\s*:?`)
	// a course code, or a bare number that borrows the previous subject ("MAT 167 or 168")
	// suffixes: L (lab), H (honors), LH (honors lab), S (support)...
	// Two-digit numbers (MAT 99) only count right after a subject, so "ACT 20"
	// style scores in the middle of a sentence aren't read as courses.
	token = regexp.MustCompile(`\(|\)|;|,|\bAND\b|\bOR\b|\b([A-Z]{2,4})\s*(\d{2,3}[A-Z]{0,3})\b|\b(\d{3}[A-Z]{0,3})\b`)
)

// Parse reads the requirements text for course self (e.g. "MAT 168"). It
// uses the enrollment requirements when present and falls back to the
// "Prerequisite: ..." sentence in the catalog description.
func Parse(self, requirements, description string) Requirements {
	text := requirements
	if !strings.Contains(strings.ToLower(text), "requisite") {
		text = prereqSentence(description)
	}
	if text == "" {
		return Requirements{}
	}

	prePart, coPart := splitByHeader(text)
	prePart, moved := classifyClauses(prePart)
	if moved != "" {
		coPart = strings.TrimSpace(coPart + " and " + moved)
	}

	return Requirements{
		Prereqs: parseExpr(self, prePart),
		Coreqs:  parseExpr(self, coPart),
	}
}

// splitByHeader assigns each stretch of text to the header before it, so
// "Corequisite: X; Prerequisites: Y" and the reverse order both work. Text
// before the first header counts as prerequisites.
func splitByHeader(text string) (pre, co string) {
	matches := header.FindAllStringSubmatchIndex(text, -1)
	if len(matches) == 0 {
		return text, ""
	}
	var preParts, coParts []string
	preParts = append(preParts, text[:matches[0][0]])
	for i, m := range matches {
		end := len(text)
		if i+1 < len(matches) {
			end = matches[i+1][0]
		}
		segment := text[m[1]:end]
		if strings.EqualFold(text[m[2]:m[3]], "co") {
			coParts = append(coParts, segment)
		} else {
			preParts = append(preParts, segment)
		}
	}
	return strings.Join(preParts, " and "), strings.Join(coParts, " and ")
}

// prereqSentence pulls "Prerequisite: C or higher in MAT 167." out of a
// catalog description like "3 hrs. Prerequisite: ... Integration, ...".
func prereqSentence(description string) string {
	lower := strings.ToLower(description)
	i := strings.Index(lower, "prerequisite")
	if i < 0 {
		return ""
	}
	rest := description[i:]
	// stop at the first ". " that isn't inside a course code like "MAT 167."
	if j := regexp.MustCompile(`\.\s+[A-Z][a-z]`).FindStringIndex(rest); j != nil {
		rest = rest[:j[0]]
	}
	return rest
}

var (
	clauseSplit = regexp.MustCompile(`\.\s+|;`)
	concurrent  = regexp.MustCompile(`(?i)\bconcurrent(ly)?\b|\bco-?\s*requisite`)
	// not requirements: advice, and eligibility notes like "Required for MAT 101 students with..."
	recommended = regexp.MustCompile(`(?i)\brecommended\b|\bsuggested\b|\brequired for\b`)
)

// classifyClauses splits requirement text into sentences and ";" clauses:
// "Concurrent registration in X" clauses are really corequisites, and
// "X recommended" clauses aren't requirements at all. The rest are rejoined
// with "and", since separate sentences are separate requirements.
func classifyClauses(text string) (prereqs, coreqs string) {
	var keep, co []string
	for _, clause := range clauseSplit.Split(text, -1) {
		switch {
		case strings.TrimSpace(clause) == "":
		case recommended.MatchString(clause):
		case concurrent.MatchString(clause):
			co = append(co, clause)
		default:
			keep = append(keep, clause)
		}
	}
	return strings.Join(keep, " and "), strings.Join(co, " and ")
}

func splitTop(toks []tok, kind string) [][]tok {
	var out [][]tok
	var cur []tok
	for _, t := range toks {
		if t.kind == kind {
			out = append(out, cur)
			cur = nil
			continue
		}
		cur = append(cur, t)
	}
	return append(out, cur)
}

// allHaveOr reports whether every chunk offers a choice between two courses.
func allHaveOr(chunks [][]tok) bool {
	for _, c := range chunks {
		courses, ors := 0, 0
		for _, t := range c {
			switch t.kind {
			case "course":
				courses++
			case "or":
				ors++
			}
		}
		if courses < 2 || ors == 0 {
			return false
		}
	}
	return true
}

// words that look like a subject code in front of a number ("score of 24",
// "ACT 20", "MATH 520") but never are one
var notSubject = map[string]bool{
	"OF": true, "IN": true, "OR": true, "AN": true, "AT": true, "BY": true, "TO": true, "ON": true,
	"IS": true, "AS": true, "BE": true, "IF": true, "NO": true, "ALL": true, "AND": true, "THE": true,
	"FOR": true, "ANY": true, "ARE": true, "ONE": true, "ACT": true, "SAT": true, "GPA": true, "HRS": true,
	"WITH": true, "FROM": true, "THAN": true, "MATH": true, "OVER": true, "LEAST": true,
}

type tok struct {
	kind   string // "(", ")", "and", "or", "course"
	course string
}

func tokenize(text string) []tok {
	for _, re := range noise {
		text = re.ReplaceAllString(text, " ")
	}
	upper := strings.ToUpper(text)
	var out []tok
	lastSubject := ""
	for _, m := range token.FindAllStringSubmatch(upper, -1) {
		switch {
		case m[0] == "(", m[0] == ")":
			out = append(out, tok{kind: m[0]})
		case m[0] == ";", m[0] == "AND":
			out = append(out, tok{kind: "and"})
		case m[0] == "OR":
			out = append(out, tok{kind: "or"})
		case m[0] == ",":
			out = append(out, tok{kind: ","})
		case m[1] != "" && notSubject[m[1]]:
			// a score or count, not a course
		case m[1] != "":
			lastSubject = m[1]
			out = append(out, tok{kind: "course", course: m[1] + " " + m[2]})
		case m[3] != "" && lastSubject != "":
			out = append(out, tok{kind: "course", course: lastSubject + " " + m[3]})
		}
	}
	return out
}

// parseExpr splits on top-level AND into groups and on OR within a group.
// Commas join like the nearest conjunction in their group ("A, B, or C" is
// one OR group; "A, B, and C" is three groups). Parenthesized parts become
// alternatives of the group they sit in.
func parseExpr(self, text string) [][]string {
	toks := tokenize(text)

	var groups [][]tok
	var cur []tok
	depth := 0
	for _, t := range toks {
		switch t.kind {
		case "(":
			depth++
		case ")":
			if depth > 0 {
				depth--
			}
		case "and":
			if depth == 0 {
				groups = append(groups, cur)
				cur = nil
				continue
			}
		}
		cur = append(cur, t)
	}
	groups = append(groups, cur)

	var out [][]string
	seen := map[string]bool{}
	add := func(courses []string) {
		var g []string
		dup := map[string]bool{}
		for _, c := range courses {
			if c != self && !dup[c] {
				dup[c] = true
				g = append(g, c)
			}
		}
		key := strings.Join(g, "|")
		if len(g) > 0 && !seen[key] {
			seen[key] = true
			out = append(out, g)
		}
	}

	for _, g := range groups {
		hasOr := false
		for _, t := range g {
			if t.kind == "or" {
				hasOr = true
			}
		}
		// "A or B, C or D": every comma chunk is its own OR pair, so the
		// commas mean AND. ("A, B, or C" is one list and falls through.)
		if hasOr {
			if chunks := splitTop(g, ","); len(chunks) > 1 && allHaveOr(chunks) {
				for _, chunk := range chunks {
					var alts []string
					for _, t := range chunk {
						if t.kind == "course" {
							alts = append(alts, t.course)
						}
					}
					add(alts)
				}
				continue
			}
		}
		if hasOr {
			var alts []string
			for _, t := range g {
				if t.kind == "course" {
					alts = append(alts, t.course)
				}
			}
			add(alts)
			continue
		}
		// no OR: commas (and nested ANDs) separate required courses
		for _, t := range g {
			if t.kind == "course" {
				add([]string{t.course})
			}
		}
	}
	return out
}
