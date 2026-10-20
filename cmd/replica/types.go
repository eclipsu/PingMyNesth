package main

import "github.com/oscusm/PingMyNest/internal/usm"

// The mock serves the same flat shape as our API.
type ClassSection = usm.ClassSection
type ClassSearchResponse = usm.ClassSearchResponse

type usmSubject struct {
	Subject string `json:"subject"`
	Descr   string `json:"descr"`
}

type usmOptionsResponse struct {
	Subjects []usmSubject `json:"subjects"`
}

const dataDir = "data"
const pidFile = "data/replica.pid"
const logFile = "data/replica.log"
const startTimeFile = "data/replica.started"
const subjectsFile = "data/subjects.json"
const catalogFile = "internal/catalog/catalog.json"
const version = "0.1.0"
