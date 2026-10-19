package main

import (
	"encoding/json"
	"net/http"
	"net/url"
	"os"

	"github.com/jackc/pgx/v5/pgtype"

	db "github.com/oscusm/PingMyNest/internal/db"
)

type apiClassSection struct {
	ClassNbr        int    `json:"class_nbr"`
	Subject         string `json:"subject"`
	CatalogNbr      string `json:"catalog_nbr"`
	ClassSection    string `json:"class_section"`
	Descr           string `json:"descr"`
	Strm            string `json:"strm"`
	EnrollmentAvail int    `json:"enrollment_available"`
	ClassCapacity   int    `json:"class_capacity"`
	EnrlStatDescr   string `json:"enrl_stat_descr"`

	Campus          string `json:"campus,omitempty"`
	AcadCareer      string `json:"acad_career,omitempty"`
	SessionCode     string `json:"session_code,omitempty"`
	Days            string `json:"days,omitempty"`
	StartTime       string `json:"start_time,omitempty"`
	EndTime         string `json:"end_time,omitempty"`
	InstructorLast  string `json:"instructor_name,omitempty"`
	InstructorFirst string `json:"instr_first_name,omitempty"`
}

type apiClassSearchResponse struct {
	PageCount int               `json:"pageCount"`
	Classes   []apiClassSection `json:"classes"`
}

// searchHandler proxies to the mock server in development, or the real USM
// endpoint in production, exposing every filter param USM's Class Search
// endpoint is known to support (see docs/usm-api-reference.md). Only
// `subject` is required; everything else narrows the result set further.
func searchHandler(queries *db.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		subject := q.Get("subject")

		if subject == "" {
			writeError(w, http.StatusBadRequest, "subject is required")
			return
		}

		development := os.Getenv("DEVELOPMENT") == "true"
		port := os.Getenv("PORT")
		if port == "" {
			port = "8081"
		}

		var baseURL string
		if development {
			baseURL = "http://localhost:" + port + "/mock-class-search"
		} else {
			baseURL = "https://soar.usm.edu/psc/guest/EMPLOYEE/SA/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearch"
		}

		u, err := url.Parse(baseURL)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "internal error building request")
			return
		}

		upstream := u.Query()
		upstream.Set("subject", subject)

		// pass through every optional filter USM's real endpoint supports,
		// only if the client actually provided it
		passthroughParams := []string{
			"catalog_nbr",
			"campus",
			"x_acad_career",
			"session_code",
			"days",
			"start_time_ge",
			"end_time_le",
			"instructor_name",
			"instr_first_name",
			"crse_attr",
			"crse_attr_value",
		}
		for _, p := range passthroughParams {
			if v := q.Get(p); v != "" {
				upstream.Set(p, v)
			}
		}

		if !development {
			// required constants for the real USM endpoint that we don't
			// expose as client-controllable params
			upstream.Set("institution", "USM01")
			if upstream.Get("term") == "" {
				upstream.Set("term", getEnvOrDefault("TERM_CODE", "4271"))
			}
			// no enrl_stat filter: "O" hides full sections, and full sections
			// are exactly the ones people want to watch
			if upstream.Get("session_code") == "" {
				upstream.Set("session_code", "1")
			}
			upstream.Set("page", "1")
		}

		u.RawQuery = upstream.Encode()

		resp, err := http.Get(u.String())
		if err != nil {
			writeError(w, http.StatusBadGateway, "error reaching class search source")
			return
		}
		defer resp.Body.Close()

		var result apiClassSearchResponse
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			writeError(w, http.StatusBadGateway, "upstream returned invalid data")
			return
		}

	if result.Classes == nil {
		result.Classes = []apiClassSection{}
	}

	ctx := r.Context()
	for _, c := range result.Classes {
			_ = queries.UpsertSection(ctx, db.UpsertSectionParams{
				ClassNbr:            int32(c.ClassNbr),
				Subject:             c.Subject,
				CatalogNbr:          c.CatalogNbr,
				ClassSection:        c.ClassSection,
				Descr:               pgtype.Text{String: c.Descr, Valid: true},
				Term:                c.Strm,
				LastEnrollmentAvail: pgtype.Int4{Int32: int32(c.EnrollmentAvail), Valid: true},
			})
		}

		writeJSON(w, http.StatusOK, result)
	}
}
