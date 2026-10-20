package main

import "testing"

func TestIsAllowedEmail(t *testing.T) {
	cases := map[string]bool{
		"rajeev.shrestha@usm.edu":     true,
		"w10123456@usm.edu":           true,
		"first_last-2@usm.edu":        true,
		"@usm.edu":                    false,
		"someone@gmail.com":           true,
		"first.last+pmn@gmail.com":    true,
		"@gmail.com":                  false,
		"someone@gmail.com.evil.com":  false,
		"someone@evilgmail.com":       false,
		"someone@yahoo.com":           false,
		"someone@evilusm.edu":         false,
		"someone@usm.edu.evil.com":    false,
		"a@b@usm.edu":                 false,
		"someone@students.usm.edu.io": false,
		"":                            false,
	}
	for email, want := range cases {
		if got := isAllowedEmail(email); got != want {
			t.Errorf("isAllowedEmail(%q) = %v, want %v", email, got, want)
		}
	}
}
