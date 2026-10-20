package usm

import (
	"encoding/json"
	"os"
	"strings"
	"testing"
)

func TestFlatten(t *testing.T) {
	s := Section{
		ClassSection: ClassSection{ClassNbr: 2804, Subject: "MAT", CatalogNbr: "167"},
		Meetings:     []Meeting{{Days: "TuTh", StartTime: "13.00.00.000000", EndTime: "14.15.00.000000"}},
		Instructors:  []Instructor{{Name: "Ching-Shyang Chen"}},
	}
	got := s.Flatten()
	if got.Days != "TR" || got.StartTime != "1:00 PM" || got.EndTime != "2:15 PM" {
		t.Errorf("schedule = %q %q-%q", got.Days, got.StartTime, got.EndTime)
	}
	if got.InstructorFirst != "Ching-Shyang" || got.InstructorLast != "Chen" {
		t.Errorf("instructor = %q %q", got.InstructorFirst, got.InstructorLast)
	}
}

func TestFlattenTBAAndStaff(t *testing.T) {
	s := Section{
		Meetings:    []Meeting{{Days: "TBA"}},
		Instructors: []Instructor{{Name: "-"}},
	}
	got := s.Flatten()
	if got.Days != "" || got.StartTime != "" || got.InstructorLast != "" {
		t.Errorf("expected empty schedule and instructor, got %+v", got)
	}
}

func TestFlattenSkipsLeadingTBAMeeting(t *testing.T) {
	s := Section{Meetings: []Meeting{{Days: "TBA"}, {Days: "MoWe", StartTime: "08.00.00.000000", EndTime: "09.15.00.000000"}}}
	if got := s.Flatten(); got.Days != "MW" || got.StartTime != "8:00 AM" {
		t.Errorf("got %q %q, want MW 8:00 AM", got.Days, got.StartTime)
	}
}

func TestClockTimeNoonMidnight(t *testing.T) {
	for in, want := range map[string]string{"12.00.00.000000": "12:00 PM", "00.30.00.000000": "12:30 AM", "": ""} {
		if got := clockTime(in); got != want {
			t.Errorf("clockTime(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestFlattenKeepsAlreadyFlat(t *testing.T) {
	s := Section{ClassSection: ClassSection{Days: "MWF", InstructorLast: "Rahimi"}}
	if got := s.Flatten(); got.Days != "MWF" || got.InstructorLast != "Rahimi" {
		t.Errorf("flat section changed: %+v", got)
	}
}

// testdata/mat_search.json is a real IScript_ClassSearch response (trimmed,
// instructor emails removed). Production decodes exactly this shape.
func TestFlattenRealUSMResponse(t *testing.T) {
	data, err := os.ReadFile("testdata/mat_search.json")
	if err != nil {
		t.Fatal(err)
	}
	var res SearchResponse
	if err := json.Unmarshal(data, &res); err != nil {
		t.Fatal(err)
	}
	if len(res.Classes) < 3 {
		t.Fatalf("fixture has %d sections", len(res.Classes))
	}
	for _, s := range res.Classes {
		c := s.Flatten()
		if c.ClassNbr == 0 || c.Subject != "MAT" || c.CatalogNbr == "" || c.Descr == "" || c.ClassCapacity == 0 {
			t.Errorf("core fields missing: %+v", c)
		}
		if s.Meetings[0].Days != "TBA" && (c.Days == "" || c.StartTime == "" || !strings.HasSuffix(c.StartTime, "M")) {
			t.Errorf("%s-%s: schedule not flattened: %q %q", c.CatalogNbr, c.ClassSection, c.Days, c.StartTime)
		}
		if len(s.Instructors) > 0 && s.Instructors[0].Name != "Staff" && c.InstructorLast == "" {
			t.Errorf("%s-%s: instructor not flattened", c.CatalogNbr, c.ClassSection)
		}
	}
}
