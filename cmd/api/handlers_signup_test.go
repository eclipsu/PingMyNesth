package main

import "testing"

func TestIsUSMEmail(t *testing.T) {
	cases := map[string]bool{
		"rajeev.shrestha@usm.edu":     true,
		"w10123456@usm.edu":           true,
		"first_last-2@usm.edu":        true,
		"@usm.edu":                    false,
		"someone@gmail.com":           false,
		"someone@evilusm.edu":         false,
		"someone@usm.edu.evil.com":    false,
		"a@b@usm.edu":                 false,
		"someone@students.usm.edu.io": false,
		"":                            false,
	}
	for email, want := range cases {
		if got := isUSMEmail(email); got != want {
			t.Errorf("isUSMEmail(%q) = %v, want %v", email, got, want)
		}
	}
}
