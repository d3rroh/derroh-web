package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ── Models ──────────────────────────────────────────────────

type message struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Subject string `json:"subject"`
	Message string `json:"message"`
	Website string `json:"_website"` // honeypot: bots fill this, humans never see it
}

var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

// ── Helpers ─────────────────────────────────────────────────

func envOr(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

// sanitizeHeader strips CR and LF from values used in SMTP headers
// to prevent email header injection attacks.
func sanitizeHeader(s string) string {
	return strings.NewReplacer("\r", "", "\n", "").Replace(s)
}

// sanitizeLog removes newlines from log output to prevent log injection.
func sanitizeLog(s string) string {
	s = strings.ReplaceAll(s, "\r", "")
	s = strings.ReplaceAll(s, "\n", "↵")
	return s
}

// ── CSRF ────────────────────────────────────────────────────

var (
	csrfToken   string
	csrfCreated time.Time
	csrfMu      sync.RWMutex
)

const csrfTTL = 24 * time.Hour

func getCSRFToken() string {
	csrfMu.RLock()
	if csrfToken != "" && time.Since(csrfCreated) < csrfTTL {
		defer csrfMu.RUnlock()
		return csrfToken
	}
	csrfMu.RUnlock()

	csrfMu.Lock()
	defer csrfMu.Unlock()

	// Double-check after acquiring write lock
	if csrfToken != "" && time.Since(csrfCreated) < csrfTTL {
		return csrfToken
	}

	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		log.Printf("csfr: failed to generate token: %v", err)
		return ""
	}
	csrfToken = hex.EncodeToString(b)
	csrfCreated = time.Now()
	return csrfToken
}

func verifyCSRF(r *http.Request) bool {
	token := r.Header.Get("X-CSRF-Token")
	if token == "" {
		return false
	}
	return token == getCSRFToken()
}

// ── Rate Limiting ───────────────────────────────────────────

type rateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visit
}

type visit struct {
	count    int
	lastSeen time.Time
}

const (
	rateLimit    = 10            // max requests per window
	rateWindow   = 1 * time.Hour // sliding window
	rateCleanup  = 5 * time.Minute
)

var rl = &rateLimiter{visitors: make(map[string]*visit)}

func init() {
	go func() {
		for {
			time.Sleep(rateCleanup)
			rl.cleanup()
		}
	}()
}

func (rl *rateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	v, exists := rl.visitors[ip]
	if !exists || time.Since(v.lastSeen) > rateWindow {
		rl.visitors[ip] = &visit{count: 1, lastSeen: time.Now()}
		return true
	}
	if v.count >= rateLimit {
		return false
	}
	v.count++
	v.lastSeen = time.Now()
	return true
}

func (rl *rateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	for ip, v := range rl.visitors {
		if time.Since(v.lastSeen) > rateWindow {
			delete(rl.visitors, ip)
		}
	}
}

// ── Handler ─────────────────────────────────────────────────

func handleContact(w http.ResponseWriter, r *http.Request) {
	// CORS: only allow same-origin
	origin := r.Header.Get("Origin")
	if origin != "" && origin != "https://derroh.co.ke" && origin != "http://localhost:8080" {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Rate limit
	ip := r.RemoteAddr
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		ip = strings.Split(fwd, ",")[0]
	}
	if !rl.allow(strings.TrimSpace(ip)) {
		http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
		return
	}

	// CSRF verification
	if !verifyCSRF(r) {
		http.Error(w, "invalid csrf token", http.StatusForbidden)
		return
	}

	// Body size limit: 1MB
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)

	var m message
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}

	// Honeypot: silently accept but discard anything a bot fills in.
	if strings.TrimSpace(m.Website) != "" {
		writeOK(w, "ok")
		return
	}

	m.Name = strings.TrimSpace(m.Name)
	m.Email = strings.TrimSpace(m.Email)
	m.Subject = strings.TrimSpace(m.Subject)
	m.Message = strings.TrimSpace(m.Message)

	// Validate
	if m.Name == "" || len(m.Name) > 120 ||
		!emailRe.MatchString(m.Email) || len(m.Email) > 254 ||
		m.Subject == "" || len(m.Subject) > 200 ||
		len(m.Message) < 10 || len(m.Message) > 10000 {
		http.Error(w, "invalid fields", http.StatusUnprocessableEntity)
		return
	}

	if err := deliver(m); err != nil {
		log.Printf("contact delivery failed: %v", err)
		http.Error(w, "delivery failed", http.StatusInternalServerError)
		return
	}

	writeOK(w, "ok")
}

func writeOK(w http.ResponseWriter, msg string) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": msg})
}

// ── CSRF Token Endpoint ─────────────────────────────────────

func handleCSRFToken(w http.ResponseWriter, r *http.Request) {
	token := getCSRFToken()
	if token == "" {
		http.Error(w, "token generation failed", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

// ── Email Delivery ──────────────────────────────────────────

// deliver sends the message over SMTP when configured; otherwise it persists
// to a log file so the message is never silently dropped.
func deliver(m message) error {
	host := os.Getenv("SMTP_HOST")
	port := envOr("SMTP_PORT", "587")
	user := os.Getenv("SMTP_USER")
	pass := os.Getenv("SMTP_PASS")
	from := envOr("SMTP_FROM", user)
	to := envOr("SMTP_TO", user)

	if host == "" || user == "" || to == "" {
		return persist(m)
	}

	// Sanitize header values — strip CR/LF to prevent header injection
	safeSubject := sanitizeHeader(m.Subject)
	safeEmail := sanitizeHeader(m.Email)
	safeName := sanitizeHeader(m.Name)

	body := "Name: " + safeName + "\n" +
		"Email: " + safeEmail + "\n\n" +
		m.Message + "\n"

	msg := "From: " + from + "\n" +
		"To: " + to + "\n" +
		"Subject: " + safeSubject + "\n" +
		"Date: " + time.Now().Format(time.RFC1123Z) + "\n" +
		"Reply-To: " + safeEmail + "\n" +
		"MIME-Version: 1.0\n" +
		"Content-Type: text/plain; charset=UTF-8\n" +
		"Content-Transfer-Encoding: 8bit\n\n" +
		body

	addr := host + ":" + port
	return smtp.SendMail(addr, smtp.PlainAuth("", user, pass, host), from, []string{to}, []byte(msg))
}

// ── Log Persistence ─────────────────────────────────────────

func persist(m message) error {
	log.Printf("[contact] name=%q email=%q subject=%q msg=%q",
		sanitizeLog(m.Name), sanitizeLog(m.Email),
		sanitizeLog(m.Subject), sanitizeLog(m.Message))

	line := "---\ntime: " + time.Now().Format(time.RFC3339) +
		"\nname: " + sanitizeLog(m.Name) +
		"\nemail: " + sanitizeLog(m.Email) +
		"\nsubject: " + sanitizeLog(m.Subject) +
		"\n\n" + sanitizeLog(m.Message) + "\n"

	f, err := os.OpenFile("/var/log/contact-messages.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0640)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = f.WriteString(line)
	return err
}

// ── Server ──────────────────────────────────────────────────

func main() {
	addr := envOr("CONTACT_ADDR", "127.0.0.1:8080")

	mux := http.NewServeMux()
	mux.HandleFunc("/api/contact", handleContact)
	mux.HandleFunc("/api/csrf-token", handleCSRFToken)

	srv := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       30 * time.Second,
	}

	log.Printf("contact server listening on %s", addr)
	log.Fatal(srv.ListenAndServe())
}
