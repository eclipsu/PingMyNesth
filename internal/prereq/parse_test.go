package prereq

import (
	"reflect"
	"testing"
)

func TestParse(t *testing.T) {
	cases := []struct {
		self, req, desc string
		pre, co         [][]string
	}{
		{self: "MAT 168", req: "Prerequisite(s): C or higher in MAT 167",
			pre: [][]string{{"MAT 167"}}},
		{self: "ACC 220", req: "Prerequisite: ACC 200",
			pre: [][]string{{"ACC 200"}}},
		{self: "ACC 309", req: "Prerequisite(s): MIS 300 and a minimum C grade or better in ACC 323.",
			pre: [][]string{{"MIS 300"}, {"ACC 323"}}},
		{self: "ACC 312", req: "Prerequisite(s): BA 260 and ACC 323 (with minimum C grade).",
			pre: [][]string{{"BA 260"}, {"ACC 323"}}},
		{self: "ACC 311", req: "Prerequisite(s): Accounting majors only."},
		{self: "MAT 167", req: "Prerequisite(s): C or higher in MAT 101 or MAT 103 or ACT math score of 24.",
			pre: [][]string{{"MAT 101", "MAT 103"}}},
		{self: "CSC 306", req: "Prerequisite(s): CSC 102 and (MAT 167 or 168).",
			pre: [][]string{{"CSC 102"}, {"MAT 167", "MAT 168"}}},
		{self: "PHY 201", req: "Prerequisite(s): MAT 167. Corequisite(s): PHY 201L.",
			pre: [][]string{{"MAT 167"}}, co: [][]string{{"PHY 201L"}}},
		{self: "CHE 255", req: "Prerequisite(s): CHE 106, CHE 107, and CHE 107L.",
			pre: [][]string{{"CHE 106"}, {"CHE 107"}, {"CHE 107L"}}},
		{self: "BSC 380", req: "Prerequisite(s): BSC 110, BSC 111, or BSC 250 or permission of instructor.",
			pre: [][]string{{"BSC 110", "BSC 111", "BSC 250"}}},
		// no requirement text: fall back to the catalog description
		{self: "MAT 168", req: "", desc: "3 hrs. Prerequisite: C or higher in MAT 167. Integration, applications of integration",
			pre: [][]string{{"MAT 167"}}},
		{self: "MAT 100", req: "", desc: "3 hrs. Quantitative reasoning for everyone."},
		// real BSC wording: concurrent registration is a corequisite
		{self: "BSC 201", req: "Prerequisite(s): BSC 110/L, BSC 111/L, and CHE 106/L. Concurrent registration in BSC 201L is required.",
			pre: [][]string{{"BSC 110"}, {"BSC 111"}, {"CHE 106"}}, co: [][]string{{"BSC 201L"}}},
		// "recommended" isn't required
		{self: "BSC 451", req: "Prerequisites: BSC 110/L, 111/L, CHE 106/L, 107/L; BSC 360 recommended.",
			pre: [][]string{{"BSC 110"}, {"BSC 111"}, {"CHE 106"}, {"CHE 107"}}},
		// separate sentences are separate requirements
		{self: "ACC 325", req: "Prerequisite(s): Minimum B grade in ACC 220. Minimum C grade in ACC 311 and ACC 323.",
			pre: [][]string{{"ACC 220"}, {"ACC 311"}, {"ACC 323"}}},
		{self: "BSC 481", req: "Prerequisite(s): BSC 370, BSC 282, and BSC 476 or 477 or permission of instructor.",
			pre: [][]string{{"BSC 370"}, {"BSC 282"}, {"BSC 476", "BSC 477"}}},
		// coreq header first, then prereqs (real CHE wording)
		{self: "CHE 251", req: "Corequisite: CHE 251L; Prerequisites: CHE 106, CHE 106L",
			pre: [][]string{{"CHE 106"}, {"CHE 106L"}}, co: [][]string{{"CHE 251L"}}},
		// two-letter suffixes, and comma-separated OR pairs are separate groups
		{self: "CHE 255", req: "Prerequisites: CHE 107 or CHE 107H, CHE 107L or CHE 107LH; Corequisite: CHE 255L",
			pre: [][]string{{"CHE 107", "CHE 107H"}, {"CHE 107L", "CHE 107LH"}}, co: [][]string{{"CHE 255L"}}},
		// a header with a qualifier
		{self: "CSC 309", req: "Prerequisite for Writing Intensive Courses: ENG 101 & ENG 102",
			pre: [][]string{{"ENG 101"}, {"ENG 102"}}},
		// real MAT wording: two-digit course, ACT alternative, support-class waiver
		{self: "MAT 101", req: "Prerequisite(s): ACT Math subscore >=20 (SAT Math subscore >= 520) or C or higher in MAT 99 or MAT 101S. Concurrent enrollment in MAT 101S waives the prerequisite.",
			pre: [][]string{{"MAT 99", "MAT 101S"}}, co: [][]string{{"MAT 101S"}}},
		{self: "MAT 101S", req: "Prerequisite(s): Required for MAT 101 students with Math ACT < 20 and no grade of C or better in MAT 99."},
		// a course never requires itself
		{self: "CSC 400", req: "Prerequisite(s): CSC 400 or CSC 306", pre: [][]string{{"CSC 306"}}},
	}
	for _, c := range cases {
		got := Parse(c.self, c.req, c.desc)
		if !reflect.DeepEqual(got.Prereqs, c.pre) || !reflect.DeepEqual(got.Coreqs, c.co) {
			t.Errorf("%s %q\n  got  pre=%v co=%v\n  want pre=%v co=%v", c.self, c.req+c.desc, got.Prereqs, got.Coreqs, c.pre, c.co)
		}
	}
}
