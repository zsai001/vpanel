package services

import (
	"io"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
	"github.com/vpanel/server/pkg/logger"
)

// TerminalService handles terminal sessions
type TerminalService struct {
	log      *logger.Logger
	sessions map[string]*TerminalSession
	mu       sync.RWMutex
}

// NewTerminalService creates a new terminal service
func NewTerminalService(log *logger.Logger) *TerminalService {
	return &TerminalService{
		log:      log,
		sessions: make(map[string]*TerminalSession),
	}
}

// TerminalSession represents an active terminal session
type TerminalSession struct {
	ID        string
	PTY       *os.File
	Cmd       *exec.Cmd
	Conn      *websocket.Conn
	CreatedAt time.Time
	LastUsed  time.Time
	Done      chan struct{}
}

// CreateSession creates a new terminal session
func (s *TerminalService) CreateSession(sessionID string, conn *websocket.Conn, shell string, cols, rows uint16) (*TerminalSession, error) {
	// Default shell
	if shell == "" {
		shell = os.Getenv("SHELL")
		if shell == "" {
			shell = "/bin/bash"
		}
	}

	// Create command
	cmd := exec.Command(shell)
	cmd.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
	)

	// Start PTY
	ptmx, err := pty.StartWithSize(cmd, &pty.Winsize{
		Cols: cols,
		Rows: rows,
	})
	if err != nil {
		return nil, err
	}

	session := &TerminalSession{
		ID:        sessionID,
		PTY:       ptmx,
		Cmd:       cmd,
		Conn:      conn,
		CreatedAt: time.Now(),
		LastUsed:  time.Now(),
		Done:      make(chan struct{}),
	}

	s.mu.Lock()
	s.sessions[sessionID] = session
	s.mu.Unlock()

	// Start goroutines to handle I/O
	go s.handlePTYOutput(session)
	go s.handleWebSocketInput(session)
	go s.waitForExit(session)

	s.log.Info("Terminal session created", "session_id", sessionID)
	return session, nil
}

// handlePTYOutput reads from PTY and writes to WebSocket
func (s *TerminalService) handlePTYOutput(session *TerminalSession) {
	buf := make([]byte, 4096)
	for {
		select {
		case <-session.Done:
			return
		default:
			n, err := session.PTY.Read(buf)
			if err != nil {
				if err != io.EOF {
					s.log.Error("PTY read error", "error", err)
				}
				s.CloseSession(session.ID)
				return
			}
			if n > 0 {
				session.LastUsed = time.Now()
				if err := session.Conn.WriteMessage(websocket.BinaryMessage, buf[:n]); err != nil {
					s.log.Error("WebSocket write error", "error", err)
					s.CloseSession(session.ID)
					return
				}
			}
		}
	}
}

// handleWebSocketInput reads from WebSocket and writes to PTY
func (s *TerminalService) handleWebSocketInput(session *TerminalSession) {
	for {
		select {
		case <-session.Done:
			return
		default:
			messageType, data, err := session.Conn.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
					s.log.Error("WebSocket read error", "error", err)
				}
				s.CloseSession(session.ID)
				return
			}

			session.LastUsed = time.Now()

			switch messageType {
			case websocket.BinaryMessage, websocket.TextMessage:
				// Check for resize message (special format: \x01<cols>;<rows>)
				if len(data) > 1 && data[0] == 1 {
					s.handleResize(session, data[1:])
					continue
				}

				if _, err := session.PTY.Write(data); err != nil {
					s.log.Error("PTY write error", "error", err)
					s.CloseSession(session.ID)
					return
				}
			}
		}
	}
}

// handleResize handles terminal resize
func (s *TerminalService) handleResize(session *TerminalSession, data []byte) {
	// Parse resize data: "cols;rows"
	var cols, rows uint16
	_, err := parseResizeData(string(data), &cols, &rows)
	if err != nil {
		return
	}

	if cols > 0 && rows > 0 {
		pty.Setsize(session.PTY, &pty.Winsize{Cols: cols, Rows: rows})
		s.log.Debug("Terminal resized", "cols", cols, "rows", rows)
	}
}

func parseResizeData(data string, cols, rows *uint16) (int, error) {
	var c, r int
	n, err := parseInts(data, &c, &r)
	if err == nil {
		*cols = uint16(c)
		*rows = uint16(r)
	}
	return n, err
}

func parseInts(data string, vals ...*int) (int, error) {
	// Simple parser for "cols;rows" format
	var idx, valIdx int
	var current int
	for i, ch := range data {
		if ch >= '0' && ch <= '9' {
			current = current*10 + int(ch-'0')
		} else if ch == ';' || i == len(data)-1 {
			if i == len(data)-1 && ch >= '0' && ch <= '9' {
				current = current*10 + int(ch-'0')
			}
			if valIdx < len(vals) {
				*vals[valIdx] = current
			}
			valIdx++
			current = 0
			idx = i + 1
		}
	}
	if valIdx > 0 && valIdx <= len(vals) && current > 0 {
		*vals[valIdx-1] = current
	}
	return idx, nil
}

// waitForExit waits for the command to exit
func (s *TerminalService) waitForExit(session *TerminalSession) {
	session.Cmd.Wait()
	s.CloseSession(session.ID)
}

// CloseSession closes a terminal session
func (s *TerminalService) CloseSession(sessionID string) {
	s.mu.Lock()
	session, ok := s.sessions[sessionID]
	if !ok {
		s.mu.Unlock()
		return
	}
	delete(s.sessions, sessionID)
	s.mu.Unlock()

	// Signal done
	select {
	case <-session.Done:
	default:
		close(session.Done)
	}

	// Close PTY
	if session.PTY != nil {
		session.PTY.Close()
	}

	// Close WebSocket
	if session.Conn != nil {
		session.Conn.Close()
	}

	// Kill process if still running
	if session.Cmd != nil && session.Cmd.Process != nil {
		session.Cmd.Process.Kill()
	}

	s.log.Info("Terminal session closed", "session_id", sessionID)
}

// GetSession returns a session by ID
func (s *TerminalService) GetSession(sessionID string) *TerminalSession {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.sessions[sessionID]
}

// ListSessions returns all active sessions
func (s *TerminalService) ListSessions() []SessionInfo {
	s.mu.RLock()
	defer s.mu.RUnlock()

	sessions := make([]SessionInfo, 0, len(s.sessions))
	for _, session := range s.sessions {
		sessions = append(sessions, SessionInfo{
			ID:        session.ID,
			CreatedAt: session.CreatedAt,
			LastUsed:  session.LastUsed,
		})
	}

	return sessions
}

// SessionInfo represents session information
type SessionInfo struct {
	ID        string    `json:"id"`
	CreatedAt time.Time `json:"created_at"`
	LastUsed  time.Time `json:"last_used"`
}

// ResizeSession resizes a terminal session
func (s *TerminalService) ResizeSession(sessionID string, cols, rows uint16) error {
	s.mu.RLock()
	session, ok := s.sessions[sessionID]
	s.mu.RUnlock()

	if !ok {
		return ErrSessionNotFound
	}

	return pty.Setsize(session.PTY, &pty.Winsize{Cols: cols, Rows: rows})
}

// CleanupStaleSessions removes sessions that have been inactive
func (s *TerminalService) CleanupStaleSessions(timeout time.Duration) {
	s.mu.Lock()
	var stale []string
	for id, session := range s.sessions {
		if time.Since(session.LastUsed) > timeout {
			stale = append(stale, id)
		}
	}
	s.mu.Unlock()

	for _, id := range stale {
		s.CloseSession(id)
	}

	if len(stale) > 0 {
		s.log.Info("Cleaned up stale terminal sessions", "count", len(stale))
	}
}

// ErrSessionNotFound is returned when session is not found
var ErrSessionNotFound = &sessionError{msg: "session not found"}

type sessionError struct {
	msg string
}

func (e *sessionError) Error() string {
	return e.msg
}



