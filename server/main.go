package main

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"mime"
	"net"
	"net/http"
	"net/smtp"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
	"unicode"
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

// sanitizeHeader strips CR, LF and every other control character from
// values used in SMTP headers to prevent email header injection.
func sanitizeHeader(s string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, s)
}

// sanitizeLog removes newlines from log output to prevent log injection.
func sanitizeLog(s string) string {
	s = strings.ReplaceAll(s, "\r", "")
	s = strings.ReplaceAll(s, "\n", "↵")
	return s
}

// ── CSRF / form token ───────────────────────────────────────
//
// Each visitor gets a stateless token: "<unix-ts>.<hmac(ts)>". It expires
// after tokenTTL, and a submit is refused if it arrives sooner than
// tokenMinAge after the token was issued (humans don't fill a form in
// under a few seconds; scripted floods do). The signing key is random per
// process unless CSRF_SECRET is set, so a restart invalidates old tokens —
// the client simply fetches a new one.

const (
	tokenTTL    = 2 * time.Hour
	tokenMinAge = 3 * time.Second
)

var tokenKey = func() []byte {
	if k := os.Getenv("CSRF_SECRET"); len(k) >= 32 {
		return []byte(k)
	}
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		log.Fatalf("csrf: failed to generate key: %v", err)
	}
	return b
}()

func signToken(ts int64) string {
	mac := hmac.New(sha256.New, tokenKey)
	mac.Write([]byte(strconv.FormatInt(ts, 10)))
	return hex.EncodeToString(mac.Sum(nil))
}

func newCSRFToken() string {
	ts := time.Now().Unix()
	return strconv.FormatInt(ts, 10) + "." + signToken(ts)
}

// verifyCSRF returns "" when the token is valid, otherwise a short reason.
func verifyCSRF(r *http.Request) string {
	tsStr, sig, ok := strings.Cut(r.Header.Get("X-CSRF-Token"), ".")
	if !ok {
		return "missing"
	}
	ts, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil {
		return "malformed"
	}
	// Constant-time comparison of the signature.
	if !hmac.Equal([]byte(sig), []byte(signToken(ts))) {
		return "bad signature"
	}
	age := time.Since(time.Unix(ts, 0))
	if age > tokenTTL {
		return "expired"
	}
	if age < tokenMinAge {
		return "too fast"
	}
	return ""
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
	rateLimit   = 10            // max requests per client per window
	rateWindow  = 1 * time.Hour // window length
	rateCleanup = 5 * time.Minute
)

var rl = &rateLimiter{visitors: make(map[string]*visit)}

// Global ceiling across all clients, so rotating IPs can't flood the
// inbox (or the fallback log file). CONTACT_GLOBAL_LIMIT overrides it.
var globalLimit = func() int {
	if n, err := strconv.Atoi(os.Getenv("CONTACT_GLOBAL_LIMIT")); err == nil && n > 0 {
		return n
	}
	return 60
}()

var (
	globalMu     sync.Mutex
	globalCount  int
	globalWindow time.Time
)

func allowGlobal() bool {
	globalMu.Lock()
	defer globalMu.Unlock()
	if time.Since(globalWindow) > rateWindow {
		globalWindow, globalCount = time.Now(), 0
	}
	if globalCount >= globalLimit {
		return false
	}
	globalCount++
	return true
}

// clientIP picks the address to rate-limit on. X-Forwarded-For is NOT
// used: its first entry is whatever the client sent, so trusting it lets
// anyone dodge the limit by changing one header.
//  1. CF-Connecting-IP — set (and overwritten) by Cloudflare.
//  2. X-Real-IP        — set by our nginx from $remote_addr.
//  3. RemoteAddr       — without the port, which changes per connection.
func clientIP(r *http.Request) string {
	for _, h := range []string{"CF-Connecting-IP", "X-Real-IP"} {
		if v := strings.TrimSpace(r.Header.Get(h)); net.ParseIP(v) != nil {
			return v
		}
	}
	if host, _, err := net.SplitHostPort(r.RemoteAddr); err == nil {
		return host
	}
	return r.RemoteAddr
}

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

	// CSRF / form token first: it's cheap and stops blind floods before
	// they consume anyone's rate-limit budget.
	if reason := verifyCSRF(r); reason != "" {
		http.Error(w, "invalid csrf token", http.StatusForbidden)
		return
	}

	// Rate limit: per client, then globally.
	ip := clientIP(r)
	if !rl.allow(ip) || !allowGlobal() {
		log.Printf("contact: rate limited %s", sanitizeLog(ip))
		http.Error(w, "rate limit exceeded", http.StatusTooManyRequests)
		return
	}

	// Body size limit: the largest valid message is ~10.6KB.
	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)

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
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	// Never let Cloudflare or a browser cache a token.
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(map[string]string{"token": newCSRFToken()})
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
		"Subject: " + mime.QEncoding.Encode("utf-8", safeSubject) + "\n" +
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
