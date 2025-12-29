package auth

import (
	"crypto/subtle"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/vpanel/core/internal/config"
	"github.com/vpanel/core/pkg/logger"
	"gorm.io/gorm"
)

// Auth errors
var (
	ErrUserNotFound        = errors.New("user not found")
	ErrInvalidPassword     = errors.New("invalid password")
	ErrAccountLocked       = errors.New("account is locked")
	ErrAccountInactive     = errors.New("account is inactive")
	ErrInvalidToken        = errors.New("invalid token")
	ErrTokenExpired        = errors.New("token expired")
	ErrMFARequired         = errors.New("mfa code required")
	ErrInvalidMFACode      = errors.New("invalid mfa code")
	ErrUserAlreadyExists   = errors.New("user already exists")
	ErrSessionNotFound     = errors.New("session not found")
	ErrSessionExpired      = errors.New("session expired")
	ErrIPBlacklisted       = errors.New("ip address is blocked")
	ErrInvalidRecoveryCode = errors.New("invalid recovery code")
	ErrMFANotEnabled       = errors.New("mfa is not enabled")
	ErrMFAAlreadyEnabled   = errors.New("mfa is already enabled")
	ErrPasswordExpired     = errors.New("password has expired")
	ErrAPIKeyNotFound      = errors.New("api key not found")
	ErrAPIKeyExpired       = errors.New("api key expired")
	ErrAPIKeyInactive      = errors.New("api key is inactive")
	ErrInsufficientPerms   = errors.New("insufficient permissions")
)

// JWTClaims represents JWT token claims
type JWTClaims struct {
	UserID      string   `json:"user_id"`
	Username    string   `json:"username"`
	Role        string   `json:"role"`
	SessionID   string   `json:"session_id"`
	Permissions []string `json:"permissions,omitempty"`
	jwt.RegisteredClaims
}

// Service handles authentication
type Service struct {
	db             *gorm.DB
	config         *config.Config
	log            *logger.Logger
	passwordPolicy *PasswordPolicy
}

// NewService creates a new auth service
func NewService(db *gorm.DB, cfg *config.Config, log *logger.Logger) *Service {
	return &Service{
		db:             db,
		config:         cfg,
		log:            log,
		passwordPolicy: DefaultPasswordPolicy(),
	}
}

// SetPasswordPolicy sets a custom password policy
func (s *Service) SetPasswordPolicy(policy *PasswordPolicy) {
	s.passwordPolicy = policy
}

// GetPasswordPolicy returns the current password policy
func (s *Service) GetPasswordPolicy() *PasswordPolicy {
	return s.passwordPolicy
}

// LoginResult contains login response data
type LoginResult struct {
	User         *SafeUser `json:"user"`
	AccessToken  string    `json:"token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresIn    int       `json:"expires_in"`
	SessionID    string    `json:"session_id"`
	MFARequired  bool      `json:"mfa_required,omitempty"`
}

// Login authenticates a user and returns tokens
func (s *Service) Login(req *LoginRequest, ipAddress, userAgent string) (*LoginResult, error) {
	// Check IP blacklist
	if s.isIPBlacklisted(ipAddress) {
		s.log.Warn("Login attempt from blacklisted IP", "ip", ipAddress)
		return nil, ErrIPBlacklisted
	}

	var user User
	if err := s.db.Where("username = ? OR email = ?", req.Username, req.Username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			s.recordLoginAttempt("", req.Username, ipAddress, userAgent, false, "user not found")
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	// Check if account is locked
	if user.IsLocked() {
		s.recordLoginAttempt(user.ID, req.Username, ipAddress, userAgent, false, "account locked")
		return nil, ErrAccountLocked
	}

	// Check if account is active
	if !user.IsActive() {
		s.recordLoginAttempt(user.ID, req.Username, ipAddress, userAgent, false, "account inactive")
		return nil, ErrAccountInactive
	}

	// Verify password
	if !CheckPassword(req.Password, user.Password) {
		s.recordLoginAttempt(user.ID, req.Username, ipAddress, userAgent, false, "invalid password")
		s.incrementFailedAttempts(&user)
		return nil, ErrInvalidPassword
	}

	// Check if password has expired
	if user.PasswordExpiresAt != nil && user.PasswordExpiresAt.Before(time.Now()) {
		return nil, ErrPasswordExpired
	}

	// Check MFA
	if user.MFAEnabled {
		if req.MFACode == "" {
			return &LoginResult{
				MFARequired: true,
			}, ErrMFARequired
		}

		// Try TOTP first
		if !ValidateTOTP(user.MFASecret, req.MFACode) {
			// Try recovery codes
			newCodes, valid := ValidateRecoveryCode(req.MFACode, user.MFARecoveryCodes)
			if !valid {
				s.recordLoginAttempt(user.ID, req.Username, ipAddress, userAgent, false, "invalid mfa code")
				return nil, ErrInvalidMFACode
			}
			// Update recovery codes
			user.MFARecoveryCodes = newCodes
			s.db.Model(&user).Update("mfa_recovery_codes", user.MFARecoveryCodes)
		}
	}

	// Reset failed attempts on successful login
	if user.FailedLoginAttempts > 0 {
		s.db.Model(&user).Updates(map[string]interface{}{
			"failed_login_attempts": 0,
			"locked_until":          nil,
		})
	}

	// Determine token expiry based on remember me
	tokenExpiry := s.config.Auth.TokenExpiry
	refreshExpiry := s.config.Auth.RefreshExpiry
	if req.RememberMe {
		refreshExpiry = refreshExpiry * 4 // 28 days instead of 7
	}

	// Generate session
	session := &Session{
		UserID:       user.ID,
		IPAddress:    ipAddress,
		UserAgent:    userAgent,
		DeviceInfo:   parseDeviceInfo(userAgent),
		ExpiresAt:    time.Now().Add(time.Duration(refreshExpiry) * 24 * time.Hour),
		LastActivity: time.Now(),
		IsActive:     true,
	}
	if err := s.db.Create(session).Error; err != nil {
		return nil, err
	}

	// Generate tokens
	accessToken, err := s.generateAccessToken(&user, session.ID)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(&user, session.ID)
	if err != nil {
		return nil, err
	}

	// Update session with tokens
	session.Token = accessToken
	session.RefreshToken = refreshToken
	if err := s.db.Save(session).Error; err != nil {
		return nil, err
	}

	// Update user last login
	now := time.Now()
	s.db.Model(&user).Updates(map[string]interface{}{
		"last_login_at": &now,
		"last_login_ip": ipAddress,
	})

	// Record successful login
	s.recordLoginAttempt(user.ID, req.Username, ipAddress, userAgent, true, "")

	// Audit log
	s.RecordAudit(AuditLog{
		UserID:     user.ID,
		Username:   user.Username,
		Action:     string(AuditActionLogin),
		Resource:   "session",
		ResourceID: session.ID,
		Details:    JSON{"ip": ipAddress, "user_agent": userAgent},
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		Status:     string(AuditStatusSuccess),
	})

	return &LoginResult{
		User:         user.ToSafe(),
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    tokenExpiry * 60,
		SessionID:    session.ID,
	}, nil
}

// Logout invalidates a user session
func (s *Service) Logout(token, userID string) error {
	var session Session
	if err := s.db.Where("token = ? AND user_id = ?", token, userID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil // Already logged out
		}
		return err
	}

	// Deactivate session instead of deleting for audit purposes
	if err := s.db.Model(&session).Update("is_active", false).Error; err != nil {
		return err
	}

	s.RecordAudit(AuditLog{
		UserID:     userID,
		Action:     string(AuditActionLogout),
		Resource:   "session",
		ResourceID: session.ID,
		Status:     string(AuditStatusSuccess),
	})

	return nil
}

// LogoutAllSessions logs out all sessions for a user
func (s *Service) LogoutAllSessions(userID string, exceptSessionID string) error {
	query := s.db.Model(&Session{}).Where("user_id = ? AND is_active = ?", userID, true)
	if exceptSessionID != "" {
		query = query.Where("id != ?", exceptSessionID)
	}

	if err := query.Update("is_active", false).Error; err != nil {
		return err
	}

	s.RecordAudit(AuditLog{
		UserID:   userID,
		Action:   string(AuditActionSessionRevoke),
		Resource: "session",
		Details:  JSON{"scope": "all", "except": exceptSessionID},
		Status:   string(AuditStatusSuccess),
	})

	return nil
}

// RevokeSession revokes a specific session
func (s *Service) RevokeSession(userID, sessionID string) error {
	result := s.db.Model(&Session{}).
		Where("id = ? AND user_id = ?", sessionID, userID).
		Update("is_active", false)

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrSessionNotFound
	}

	s.RecordAudit(AuditLog{
		UserID:     userID,
		Action:     string(AuditActionSessionRevoke),
		Resource:   "session",
		ResourceID: sessionID,
		Status:     string(AuditStatusSuccess),
	})

	return nil
}

// GetActiveSessions returns all active sessions for a user
func (s *Service) GetActiveSessions(userID, currentSessionID string) ([]SessionInfo, error) {
	var sessions []Session
	if err := s.db.Where("user_id = ? AND is_active = ? AND expires_at > ?", userID, true, time.Now()).
		Order("last_activity DESC").
		Find(&sessions).Error; err != nil {
		return nil, err
	}

	infos := make([]SessionInfo, len(sessions))
	for i, session := range sessions {
		infos[i] = SessionInfo{
			ID:           session.ID,
			IPAddress:    session.IPAddress,
			UserAgent:    session.UserAgent,
			DeviceInfo:   session.DeviceInfo,
			Location:     session.Location,
			LastActivity: session.LastActivity,
			CreatedAt:    session.CreatedAt,
			IsCurrent:    session.ID == currentSessionID,
		}
	}

	return infos, nil
}

// RefreshToken refreshes access token
func (s *Service) RefreshToken(refreshToken string) (*LoginResult, error) {
	// Validate refresh token
	claims, err := s.ValidateToken(refreshToken)
	if err != nil {
		return nil, ErrInvalidToken
	}

	// Check if session exists and is active
	var session Session
	if err := s.db.Preload("User").
		Where("id = ? AND refresh_token = ? AND is_active = ?", claims.SessionID, refreshToken, true).
		First(&session).Error; err != nil {
		return nil, ErrSessionNotFound
	}

	if session.IsExpired() {
		s.db.Model(&session).Update("is_active", false)
		return nil, ErrSessionExpired
	}

	// Check if user is still active
	if !session.User.IsActive() {
		return nil, ErrAccountInactive
	}

	// Generate new tokens
	accessToken, err := s.generateAccessToken(&session.User, session.ID)
	if err != nil {
		return nil, err
	}

	newRefreshToken, err := s.generateRefreshToken(&session.User, session.ID)
	if err != nil {
		return nil, err
	}

	// Update session
	session.Token = accessToken
	session.RefreshToken = newRefreshToken
	session.LastActivity = time.Now()
	session.ExpiresAt = time.Now().Add(time.Duration(s.config.Auth.RefreshExpiry) * 24 * time.Hour)
	s.db.Save(&session)

	return &LoginResult{
		User:         session.User.ToSafe(),
		AccessToken:  accessToken,
		RefreshToken: newRefreshToken,
		ExpiresIn:    s.config.Auth.TokenExpiry * 60,
		SessionID:    session.ID,
	}, nil
}

// ValidateToken validates a JWT token and returns the claims
func (s *Service) ValidateToken(tokenString string) (*JWTClaims, error) {
	claims := &JWTClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.getJWTSecret()), nil
	})

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrTokenExpired
		}
		return nil, ErrInvalidToken
	}

	if !token.Valid {
		return nil, ErrInvalidToken
	}

	return claims, nil
}

// ValidateSession validates a session and updates last activity
func (s *Service) ValidateSession(sessionID string) (*Session, error) {
	var session Session
	if err := s.db.Preload("User").
		Where("id = ? AND is_active = ?", sessionID, true).
		First(&session).Error; err != nil {
		return nil, ErrSessionNotFound
	}

	if session.IsExpired() {
		s.db.Model(&session).Update("is_active", false)
		return nil, ErrSessionExpired
	}

	// Update last activity (only every 5 minutes to reduce DB writes)
	if time.Since(session.LastActivity) > 5*time.Minute {
		s.db.Model(&session).Update("last_activity", time.Now())
	}

	return &session, nil
}

// GetUserByID returns user by ID
func (s *Service) GetUserByID(userID string) (*User, error) {
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// GetUserByUsername returns user by username
func (s *Service) GetUserByUsername(username string) (*User, error) {
	var user User
	if err := s.db.Where("username = ?", username).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}
	return &user, nil
}

// Register creates a new user
func (s *Service) Register(req *RegisterRequest) (*User, error) {
	// Check if user exists
	var count int64
	s.db.Model(&User{}).Where("username = ? OR email = ?", req.Username, req.Email).Count(&count)
	if count > 0 {
		return nil, ErrUserAlreadyExists
	}

	// Validate password
	if err := s.passwordPolicy.ValidatePassword(req.Password, req.Username, req.Email, nil); err != nil {
		return nil, err
	}

	// Hash password
	hashedPassword, err := HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Set password expiry if policy requires
	var passwordExpiry *time.Time
	if s.passwordPolicy.MaxAge > 0 {
		expiry := time.Now().AddDate(0, 0, s.passwordPolicy.MaxAge)
		passwordExpiry = &expiry
	}

	now := time.Now()
	user := &User{
		Username:           req.Username,
		Email:              req.Email,
		Password:           hashedPassword,
		DisplayName:        req.DisplayName,
		Role:               string(RoleUser),
		Status:             string(UserStatusActive),
		LastPasswordChange: &now,
		PasswordExpiresAt:  passwordExpiry,
		PasswordHistory:    StringArray{hashedPassword},
	}

	if user.DisplayName == "" {
		user.DisplayName = req.Username
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}

	s.RecordAudit(AuditLog{
		UserID:     user.ID,
		Username:   user.Username,
		Action:     string(AuditActionUserCreate),
		Resource:   "user",
		ResourceID: user.ID,
		Status:     string(AuditStatusSuccess),
	})

	return user, nil
}

// ChangePassword changes user password
func (s *Service) ChangePassword(userID string, req *ChangePasswordRequest, ipAddress, userAgent string) error {
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return ErrUserNotFound
	}

	// Verify old password
	if !CheckPassword(req.OldPassword, user.Password) {
		return ErrInvalidPassword
	}

	// Validate new password
	if err := s.passwordPolicy.ValidatePassword(req.NewPassword, user.Username, user.Email, user.PasswordHistory); err != nil {
		return err
	}

	// Hash new password
	hashedPassword, err := HashPassword(req.NewPassword)
	if err != nil {
		return err
	}

	// Update password history
	history := user.PasswordHistory
	if history == nil {
		history = StringArray{}
	}
	history = append([]string{hashedPassword}, history...)
	if len(history) > s.passwordPolicy.HistoryCount {
		history = history[:s.passwordPolicy.HistoryCount]
	}

	// Set new password expiry
	var passwordExpiry *time.Time
	if s.passwordPolicy.MaxAge > 0 {
		expiry := time.Now().AddDate(0, 0, s.passwordPolicy.MaxAge)
		passwordExpiry = &expiry
	}

	now := time.Now()
	if err := s.db.Model(&user).Updates(map[string]interface{}{
		"password":             hashedPassword,
		"last_password_change": &now,
		"password_expires_at":  passwordExpiry,
		"password_history":     history,
	}).Error; err != nil {
		return err
	}

	s.RecordAudit(AuditLog{
		UserID:     userID,
		Username:   user.Username,
		Action:     string(AuditActionPasswordChange),
		Resource:   "user",
		ResourceID: userID,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		Status:     string(AuditStatusSuccess),
	})

	return nil
}

// AdminResetPassword allows admin to reset a user's password
func (s *Service) AdminResetPassword(userID, newPassword string) error {
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return ErrUserNotFound
	}

	// Hash new password
	hashedPassword, err := HashPassword(newPassword)
	if err != nil {
		return err
	}

	now := time.Now()
	if err := s.db.Model(&user).Updates(map[string]interface{}{
		"password":              hashedPassword,
		"last_password_change":  &now,
		"failed_login_attempts": 0,
		"locked_until":          nil,
	}).Error; err != nil {
		return err
	}

	s.log.Info("Admin reset password for user", "user_id", userID, "username", user.Username)
	return nil
}

// UpdateProfile updates user profile
func (s *Service) UpdateProfile(userID string, req *UpdateProfileRequest) (*User, error) {
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, ErrUserNotFound
	}

	updates := make(map[string]interface{})

	if req.DisplayName != "" {
		updates["display_name"] = req.DisplayName
	}
	if req.Email != "" && req.Email != user.Email {
		// Check if email is already used
		var count int64
		s.db.Model(&User{}).Where("email = ? AND id != ?", req.Email, userID).Count(&count)
		if count > 0 {
			return nil, ErrUserAlreadyExists
		}
		updates["email"] = req.Email
		updates["email_verified"] = false
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	if req.Preferences != nil {
		updates["preferences"] = req.Preferences
	}

	if len(updates) > 0 {
		if err := s.db.Model(&user).Updates(updates).Error; err != nil {
			return nil, err
		}
		s.db.First(&user, "id = ?", userID)
	}

	s.RecordAudit(AuditLog{
		UserID:     userID,
		Username:   user.Username,
		Action:     string(AuditActionProfileUpdate),
		Resource:   "user",
		ResourceID: userID,
		Details:    JSON(updates),
		Status:     string(AuditStatusSuccess),
	})

	return &user, nil
}

// EnableMFA enables MFA for a user
func (s *Service) EnableMFA(userID, totpCode string) (*MFASetupResponse, error) {
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, ErrUserNotFound
	}

	if user.MFAEnabled {
		return nil, ErrMFAAlreadyEnabled
	}

	// If no code provided, generate setup
	if totpCode == "" {
		setup, err := GenerateMFASetup("VPanel", user.Username)
		if err != nil {
			return nil, err
		}

		// Store secret temporarily (user needs to verify it)
		s.db.Model(&user).Update("mfa_secret", setup.Secret)

		return &MFASetupResponse{
			Secret:        setup.Secret,
			QRCode:        setup.URI, // Client can generate QR from URI
			RecoveryCodes: setup.RecoveryCodes,
		}, nil
	}

	// Verify the TOTP code
	if !ValidateTOTP(user.MFASecret, totpCode) {
		return nil, ErrInvalidMFACode
	}

	// Generate recovery codes
	recoveryCodes, err := GenerateRecoveryCodes(10)
	if err != nil {
		return nil, err
	}

	// Enable MFA
	if err := s.db.Model(&user).Updates(map[string]interface{}{
		"mfa_enabled":        true,
		"mfa_recovery_codes": recoveryCodes,
	}).Error; err != nil {
		return nil, err
	}

	s.RecordAudit(AuditLog{
		UserID:     userID,
		Username:   user.Username,
		Action:     string(AuditActionMFAEnable),
		Resource:   "user",
		ResourceID: userID,
		Status:     string(AuditStatusSuccess),
	})

	return &MFASetupResponse{
		Secret:        user.MFASecret,
		RecoveryCodes: recoveryCodes,
	}, nil
}

// DisableMFA disables MFA for a user
func (s *Service) DisableMFA(userID, password string) error {
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return ErrUserNotFound
	}

	if !user.MFAEnabled {
		return ErrMFANotEnabled
	}

	// Verify password
	if !CheckPassword(password, user.Password) {
		return ErrInvalidPassword
	}

	if err := s.db.Model(&user).Updates(map[string]interface{}{
		"mfa_enabled":        false,
		"mfa_secret":         "",
		"mfa_recovery_codes": nil,
	}).Error; err != nil {
		return err
	}

	s.RecordAudit(AuditLog{
		UserID:     userID,
		Username:   user.Username,
		Action:     string(AuditActionMFADisable),
		Resource:   "user",
		ResourceID: userID,
		Status:     string(AuditStatusSuccess),
	})

	return nil
}

// RegenerateRecoveryCodes generates new recovery codes
func (s *Service) RegenerateRecoveryCodes(userID, password string) ([]string, error) {
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, ErrUserNotFound
	}

	if !user.MFAEnabled {
		return nil, ErrMFANotEnabled
	}

	// Verify password
	if !CheckPassword(password, user.Password) {
		return nil, ErrInvalidPassword
	}

	// Generate new recovery codes
	recoveryCodes, err := GenerateRecoveryCodes(10)
	if err != nil {
		return nil, err
	}

	if err := s.db.Model(&user).Update("mfa_recovery_codes", recoveryCodes).Error; err != nil {
		return nil, err
	}

	return recoveryCodes, nil
}

// CreateAPIKey creates a new API key for a user
func (s *Service) CreateAPIKey(userID string, req *CreateAPIKeyRequest) (*CreateAPIKeyResponse, error) {
	key, prefix, err := GenerateAPIKey()
	if err != nil {
		return nil, err
	}

	keyHash, err := HashPassword(key)
	if err != nil {
		return nil, err
	}

	rateLimit := req.RateLimit
	if rateLimit <= 0 {
		rateLimit = 1000
	}

	apiKey := &APIKey{
		UserID:      userID,
		Name:        req.Name,
		KeyHash:     keyHash,
		KeyPrefix:   prefix,
		Permissions: req.Permissions,
		ExpiresAt:   req.ExpiresAt,
		IsActive:    true,
		RateLimit:   rateLimit,
	}

	if err := s.db.Create(apiKey).Error; err != nil {
		return nil, err
	}

	s.RecordAudit(AuditLog{
		UserID:     userID,
		Action:     string(AuditActionAPIKeyCreate),
		Resource:   "api_key",
		ResourceID: apiKey.ID,
		Details:    JSON{"name": req.Name, "prefix": prefix},
		Status:     string(AuditStatusSuccess),
	})

	return &CreateAPIKeyResponse{
		APIKey:    apiKey,
		SecretKey: key,
	}, nil
}

// ValidateAPIKey validates an API key and returns the associated user
func (s *Service) ValidateAPIKey(key string) (*User, *APIKey, error) {
	if len(key) < 8 {
		return nil, nil, ErrAPIKeyNotFound
	}

	prefix := key[:8]

	var apiKeys []APIKey
	if err := s.db.Preload("User").Where("key_prefix = ? AND is_active = ?", prefix, true).Find(&apiKeys).Error; err != nil {
		return nil, nil, err
	}

	for _, apiKey := range apiKeys {
		if CheckPassword(key, apiKey.KeyHash) {
			if apiKey.IsExpired() {
				return nil, nil, ErrAPIKeyExpired
			}

			// Update last used
			now := time.Now()
			s.db.Model(&apiKey).Updates(map[string]interface{}{
				"last_used_at": &now,
			})

			return &apiKey.User, &apiKey, nil
		}
	}

	return nil, nil, ErrAPIKeyNotFound
}

// DeleteAPIKey deletes an API key
func (s *Service) DeleteAPIKey(userID, keyID string) error {
	result := s.db.Where("id = ? AND user_id = ?", keyID, userID).Delete(&APIKey{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrAPIKeyNotFound
	}

	s.RecordAudit(AuditLog{
		UserID:     userID,
		Action:     string(AuditActionAPIKeyDelete),
		Resource:   "api_key",
		ResourceID: keyID,
		Status:     string(AuditStatusSuccess),
	})

	return nil
}

// GetAPIKeys returns all API keys for a user
func (s *Service) GetAPIKeys(userID string) ([]APIKey, error) {
	var keys []APIKey
	if err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&keys).Error; err != nil {
		return nil, err
	}
	return keys, nil
}

// RequestPasswordReset creates a password reset request
func (s *Service) RequestPasswordReset(email, ipAddress string) (string, error) {
	var user User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		// Don't reveal if user exists
		return "", nil
	}

	// Generate reset token
	token, err := GenerateSecureToken(32)
	if err != nil {
		return "", err
	}

	// Invalidate existing reset requests
	s.db.Where("user_id = ? AND used_at IS NULL", user.ID).Delete(&PasswordResetRequest{})

	// Create new reset request
	reset := &PasswordResetRequest{
		UserID:    user.ID,
		Token:     token,
		IPAddress: ipAddress,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}

	if err := s.db.Create(reset).Error; err != nil {
		return "", err
	}

	// Return token (in production, send via email)
	return token, nil
}

// ResetPassword resets password using a reset token
func (s *Service) ResetPassword(token, newPassword string) error {
	var reset PasswordResetRequest
	if err := s.db.Where("token = ?", token).First(&reset).Error; err != nil {
		return ErrInvalidToken
	}

	if reset.IsExpired() || reset.IsUsed() {
		return ErrTokenExpired
	}

	var user User
	if err := s.db.First(&user, "id = ?", reset.UserID).Error; err != nil {
		return ErrUserNotFound
	}

	// Validate new password
	if err := s.passwordPolicy.ValidatePassword(newPassword, user.Username, user.Email, user.PasswordHistory); err != nil {
		return err
	}

	// Hash new password
	hashedPassword, err := HashPassword(newPassword)
	if err != nil {
		return err
	}

	// Update password
	now := time.Now()
	if err := s.db.Model(&user).Updates(map[string]interface{}{
		"password":              hashedPassword,
		"last_password_change":  &now,
		"failed_login_attempts": 0,
		"locked_until":          nil,
		"status":                string(UserStatusActive),
	}).Error; err != nil {
		return err
	}

	// Mark reset request as used
	s.db.Model(&reset).Update("used_at", &now)

	// Invalidate all sessions
	s.LogoutAllSessions(user.ID, "")

	s.RecordAudit(AuditLog{
		UserID:     user.ID,
		Username:   user.Username,
		Action:     string(AuditActionPasswordChange),
		Resource:   "user",
		ResourceID: user.ID,
		Details:    JSON{"method": "reset"},
		Status:     string(AuditStatusSuccess),
	})

	return nil
}

// AdminUpdateUser allows admin to update user details
func (s *Service) AdminUpdateUser(adminID, userID string, updates map[string]interface{}) (*User, error) {
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return nil, ErrUserNotFound
	}

	oldUser := user

	// Filter allowed fields
	allowed := map[string]bool{
		"display_name": true,
		"email":        true,
		"role":         true,
		"status":       true,
		"permissions":  true,
	}

	filtered := make(map[string]interface{})
	for k, v := range updates {
		if allowed[k] {
			filtered[k] = v
		}
	}

	if len(filtered) == 0 {
		return &user, nil
	}

	if err := s.db.Model(&user).Updates(filtered).Error; err != nil {
		return nil, err
	}

	s.db.First(&user, "id = ?", userID)

	s.RecordAudit(AuditLog{
		UserID:     adminID,
		Action:     string(AuditActionUserUpdate),
		Resource:   "user",
		ResourceID: userID,
		OldValue:   JSON{"role": oldUser.Role, "status": oldUser.Status},
		NewValue:   JSON(filtered),
		Status:     string(AuditStatusSuccess),
	})

	return &user, nil
}

// AdminDeleteUser allows admin to delete a user
func (s *Service) AdminDeleteUser(adminID, userID string) error {
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return ErrUserNotFound
	}

	// Deactivate all sessions first
	s.LogoutAllSessions(userID, "")

	// Delete related records (API keys, sessions)
	s.db.Unscoped().Where("user_id = ?", userID).Delete(&APIKey{})
	s.db.Unscoped().Where("user_id = ?", userID).Delete(&Session{})

	// Hard delete the user (Unscoped bypasses soft delete)
	if err := s.db.Unscoped().Delete(&user).Error; err != nil {
		return err
	}

	s.RecordAudit(AuditLog{
		UserID:     adminID,
		Action:     string(AuditActionUserDelete),
		Resource:   "user",
		ResourceID: userID,
		Details:    JSON{"username": user.Username, "email": user.Email},
		Status:     string(AuditStatusSuccess),
	})

	return nil
}

// ListUsers lists all users with pagination
func (s *Service) ListUsers(page, pageSize int, search, role, status string) ([]User, int64, error) {
	var users []User
	var total int64

	query := s.db.Model(&User{})

	if search != "" {
		search = "%" + search + "%"
		query = query.Where("username LIKE ? OR email LIKE ? OR display_name LIKE ?", search, search, search)
	}
	if role != "" {
		query = query.Where("role = ?", role)
	}
	if status != "" {
		query = query.Where("status = ?", status)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// GetAuditLogs retrieves audit logs with filtering
func (s *Service) GetAuditLogs(userID, action, resource string, startTime, endTime *time.Time, page, pageSize int) ([]AuditLog, int64, error) {
	var logs []AuditLog
	var total int64

	query := s.db.Model(&AuditLog{})

	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if resource != "" {
		query = query.Where("resource = ?", resource)
	}
	if startTime != nil {
		query = query.Where("created_at >= ?", startTime)
	}
	if endTime != nil {
		query = query.Where("created_at <= ?", endTime)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&logs).Error; err != nil {
		return nil, 0, err
	}

	return logs, total, nil
}

// RecordAudit records an audit log entry
func (s *Service) RecordAudit(log AuditLog) {
	log.CreatedAt = time.Now()
	if err := s.db.Create(&log).Error; err != nil {
		s.log.Error("Failed to record audit log", "error", err)
	}
}

// AuditStats represents audit log statistics
type AuditStats struct {
	TotalLogs            int64            `json:"total_logs"`
	TodayLogs            int64            `json:"today_logs"`
	FailedActions        int64            `json:"failed_actions"`
	UniqueUsers          int64            `json:"unique_users"`
	ActionDistribution   map[string]int64 `json:"action_distribution"`
	ResourceDistribution map[string]int64 `json:"resource_distribution"`
}

// GetAuditStats retrieves audit log statistics
func (s *Service) GetAuditStats() (*AuditStats, error) {
	stats := &AuditStats{
		ActionDistribution:   make(map[string]int64),
		ResourceDistribution: make(map[string]int64),
	}

	// Total logs
	s.db.Model(&AuditLog{}).Count(&stats.TotalLogs)

	// Today's logs
	today := time.Now().Truncate(24 * time.Hour)
	s.db.Model(&AuditLog{}).Where("created_at >= ?", today).Count(&stats.TodayLogs)

	// Failed actions
	s.db.Model(&AuditLog{}).Where("status = ?", "failed").Count(&stats.FailedActions)

	// Unique users
	s.db.Model(&AuditLog{}).Distinct("user_id").Count(&stats.UniqueUsers)

	// Action distribution
	var actionCounts []struct {
		Action string
		Count  int64
	}
	s.db.Model(&AuditLog{}).Select("action, count(*) as count").Group("action").Find(&actionCounts)
	for _, ac := range actionCounts {
		stats.ActionDistribution[ac.Action] = ac.Count
	}

	// Resource distribution
	var resourceCounts []struct {
		Resource string
		Count    int64
	}
	s.db.Model(&AuditLog{}).Select("resource, count(*) as count").Group("resource").Find(&resourceCounts)
	for _, rc := range resourceCounts {
		stats.ResourceDistribution[rc.Resource] = rc.Count
	}

	return stats, nil
}

// GetAuditActions retrieves distinct audit actions
func (s *Service) GetAuditActions() ([]string, error) {
	var actions []string
	if err := s.db.Model(&AuditLog{}).Distinct("action").Pluck("action", &actions).Error; err != nil {
		return nil, err
	}
	return actions, nil
}

// GetAuditResources retrieves distinct audit resources
func (s *Service) GetAuditResources() ([]string, error) {
	var resources []string
	if err := s.db.Model(&AuditLog{}).Distinct("resource").Pluck("resource", &resources).Error; err != nil {
		return nil, err
	}
	return resources, nil
}

// BlockIP adds an IP to the blacklist
func (s *Service) BlockIP(ipAddress, reason, createdBy string, duration *time.Duration) error {
	var expiresAt *time.Time
	if duration != nil {
		t := time.Now().Add(*duration)
		expiresAt = &t
	}

	block := &IPBlacklist{
		IPAddress: ipAddress,
		Reason:    reason,
		ExpiresAt: expiresAt,
		CreatedBy: createdBy,
	}

	return s.db.Create(block).Error
}

// UnblockIP removes an IP from the blacklist
func (s *Service) UnblockIP(ipAddress string) error {
	return s.db.Where("ip_address = ?", ipAddress).Delete(&IPBlacklist{}).Error
}

// Internal methods

func (s *Service) generateAccessToken(user *User, sessionID string) (string, error) {
	claims := JWTClaims{
		UserID:      user.ID,
		Username:    user.Username,
		Role:        user.Role,
		SessionID:   sessionID,
		Permissions: user.Permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(s.config.Auth.TokenExpiry) * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "vpanel",
			Subject:   user.ID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.getJWTSecret()))
}

func (s *Service) generateRefreshToken(user *User, sessionID string) (string, error) {
	claims := JWTClaims{
		UserID:    user.ID,
		SessionID: sessionID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(s.config.Auth.RefreshExpiry) * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
			Issuer:    "vpanel-refresh",
			Subject:   user.ID,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.getJWTSecret()))
}

func (s *Service) getJWTSecret() string {
	if s.config.Auth.JWTSecret != "" {
		return s.config.Auth.JWTSecret
	}
	s.log.Warn("Using default JWT secret - please set VPANEL_JWT_SECRET in production")
	return "vpanel-default-secret-change-me-in-production"
}

func (s *Service) recordLoginAttempt(userID, username, ipAddress, userAgent string, success bool, reason string) {
	attempt := &LoginAttempt{
		Username:  username,
		UserID:    userID,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Success:   success,
		Reason:    reason,
	}
	if err := s.db.Create(attempt).Error; err != nil {
		s.log.Error("Failed to record login attempt", "error", err)
	}
}

func (s *Service) incrementFailedAttempts(user *User) {
	user.FailedLoginAttempts++
	updates := map[string]interface{}{
		"failed_login_attempts": user.FailedLoginAttempts,
	}

	// Lock account if max attempts exceeded
	if user.FailedLoginAttempts >= s.config.Auth.MaxLoginAttempts {
		lockUntil := time.Now().Add(time.Duration(s.config.Auth.LockoutDuration) * time.Minute)
		updates["locked_until"] = &lockUntil
		updates["status"] = string(UserStatusLocked)
		s.log.Warn("Account locked due to failed login attempts", "user_id", user.ID, "attempts", user.FailedLoginAttempts)
	}

	s.db.Model(user).Updates(updates)
}

func (s *Service) isIPBlacklisted(ipAddress string) bool {
	var block IPBlacklist
	err := s.db.Where("ip_address = ?", ipAddress).First(&block).Error
	if err != nil {
		return false
	}
	return block.IsActive()
}

// parseDeviceInfo extracts device information from user agent
func parseDeviceInfo(userAgent string) string {
	ua := strings.ToLower(userAgent)

	var os, browser string

	// Detect OS
	switch {
	case strings.Contains(ua, "windows"):
		os = "Windows"
	case strings.Contains(ua, "mac"):
		os = "macOS"
	case strings.Contains(ua, "linux"):
		os = "Linux"
	case strings.Contains(ua, "android"):
		os = "Android"
	case strings.Contains(ua, "iphone") || strings.Contains(ua, "ipad"):
		os = "iOS"
	default:
		os = "Unknown"
	}

	// Detect Browser
	switch {
	case strings.Contains(ua, "chrome") && !strings.Contains(ua, "edge"):
		browser = "Chrome"
	case strings.Contains(ua, "firefox"):
		browser = "Firefox"
	case strings.Contains(ua, "safari") && !strings.Contains(ua, "chrome"):
		browser = "Safari"
	case strings.Contains(ua, "edge"):
		browser = "Edge"
	default:
		browser = "Unknown"
	}

	return fmt.Sprintf("%s / %s", os, browser)
}

// VerifyPassword securely compares password using constant-time comparison
func VerifyPassword(password, hash string) bool {
	return subtle.ConstantTimeCompare([]byte(password), []byte(hash)) == 1
}

// GetSystemSettings retrieves all system settings grouped by category
func (s *Service) GetSystemSettings() (map[string]map[string]interface{}, error) {
	var settings []SystemSetting
	if err := s.db.Find(&settings).Error; err != nil {
		return nil, err
	}

	// Group settings by category
	result := map[string]map[string]interface{}{
		"general":       {},
		"security":      {},
		"notifications": {},
		"backup":        {},
		"advanced":      {},
	}

	// Set default values
	defaults := map[string]map[string]interface{}{
		"general": {
			"site_name":        "VPanel",
			"site_url":         "http://localhost:8080",
			"site_description": "Server Management Platform",
			"theme":            "system",
			"language":         "en",
			"timezone":         "UTC",
		},
		"security": {
			"enable_2fa":             false,
			"require_2fa":            false,
			"session_timeout":        1440,
			"max_login_attempts":     5,
			"lockout_duration":       30,
			"oauth_github_enabled":   false,
			"oauth_github_client_id": "",
			"oauth_google_enabled":   false,
			"oauth_google_client_id": "",
		},
		"notifications": {
			"email_enabled":   false,
			"smtp_host":       "",
			"smtp_port":       587,
			"smtp_username":   "",
			"smtp_password":   "",
			"from_email":      "",
			"cpu_alerts":      true,
			"memory_alerts":   true,
			"disk_alerts":     true,
			"service_alerts":  true,
			"ssl_alerts":      true,
			"security_alerts": true,
			"webhook_enabled": false,
			"webhook_url":     "",
		},
		"backup": {
			"auto_backup_enabled": false,
			"backup_schedule":     "daily",
			"backup_retention":    7,
			"backup_time":         "02:00",
			"storage_type":        "local",
			"backup_path":         "/var/backups/vpanel",
		},
		"advanced": {
			"server_port":        8080,
			"max_upload_size":    100,
			"enable_https":       false,
			"rate_limit_enabled": false,
			"log_level":          "info",
			"log_retention":      30,
		},
	}

	// Apply defaults first
	for category, values := range defaults {
		for key, value := range values {
			result[category][key] = value
		}
	}

	// Override with database values
	for _, setting := range settings {
		if _, ok := result[setting.Category]; ok {
			result[setting.Category][setting.Key] = setting.Value
		}
	}

	return result, nil
}

// UpdateSystemSettings updates system settings
func (s *Service) UpdateSystemSettings(userID string, updates map[string]interface{}) error {
	for key, value := range updates {
		setting := SystemSetting{
			Key:       key,
			Value:     fmt.Sprintf("%v", value),
			UpdatedBy: userID,
		}

		// Determine category based on key
		switch {
		case strings.HasPrefix(key, "site_") || key == "theme" || key == "language" || key == "timezone":
			setting.Category = "general"
		case strings.HasPrefix(key, "oauth_") || strings.HasPrefix(key, "session_") || strings.HasPrefix(key, "max_login") || strings.HasPrefix(key, "lockout_") || strings.HasPrefix(key, "enable_2fa") || strings.HasPrefix(key, "require_2fa"):
			setting.Category = "security"
		case strings.HasPrefix(key, "smtp_") || strings.HasPrefix(key, "email_") || strings.HasPrefix(key, "from_") || strings.HasSuffix(key, "_alerts") || strings.HasPrefix(key, "webhook_"):
			setting.Category = "notifications"
		case strings.HasPrefix(key, "backup_") || strings.HasPrefix(key, "auto_backup") || strings.HasPrefix(key, "storage_"):
			setting.Category = "backup"
		default:
			setting.Category = "advanced"
		}

		if err := s.db.Save(&setting).Error; err != nil {
			return err
		}
	}

	return nil
}

// ============================================
// Role Management
// ============================================

// RoleNotFoundError represents a role not found error
var ErrRoleNotFound = errors.New("role not found")

// ErrRoleInUse represents a role in use error
var ErrRoleInUse = errors.New("role is in use and cannot be deleted")

// ErrSystemRoleModify represents attempt to modify system role error
var ErrSystemRoleModify = errors.New("system roles cannot be modified")

// ListRoles returns all roles
func (s *Service) ListRoles() ([]Role, error) {
	var roles []Role
	if err := s.db.Order("priority DESC, name ASC").Find(&roles).Error; err != nil {
		return nil, err
	}
	return roles, nil
}

// GetRole returns a role by ID
func (s *Service) GetRole(roleID string) (*Role, error) {
	var role Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}
	return &role, nil
}

// GetRoleByName returns a role by name
func (s *Service) GetRoleByName(name string) (*Role, error) {
	var role Role
	if err := s.db.First(&role, "name = ?", name).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}
	return &role, nil
}

// CreateRoleRequest represents role creation data
type CreateRoleRequest struct {
	Name        string      `json:"name" binding:"required,min=2,max=50"`
	DisplayName string      `json:"display_name" binding:"max=100"`
	Description string      `json:"description" binding:"max=500"`
	Permissions StringArray `json:"permissions"`
	Priority    int         `json:"priority"`
}

// CreateRole creates a new custom role
func (s *Service) CreateRole(req *CreateRoleRequest) (*Role, error) {
	// Check if role name already exists
	var count int64
	s.db.Model(&Role{}).Where("name = ?", req.Name).Count(&count)
	if count > 0 {
		return nil, errors.New("role name already exists")
	}

	role := &Role{
		Name:        req.Name,
		DisplayName: req.DisplayName,
		Description: req.Description,
		Permissions: req.Permissions,
		IsSystem:    false,
		Priority:    req.Priority,
	}

	if role.DisplayName == "" {
		role.DisplayName = role.Name
	}

	if err := s.db.Create(role).Error; err != nil {
		return nil, err
	}

	s.RecordAudit(AuditLog{
		Action:     "role_create",
		Resource:   "role",
		ResourceID: role.ID,
		Details:    JSON{"name": role.Name},
		Status:     string(AuditStatusSuccess),
	})

	return role, nil
}

// UpdateRoleRequest represents role update data
type UpdateRoleRequest struct {
	DisplayName *string      `json:"display_name"`
	Description *string      `json:"description"`
	Permissions *StringArray `json:"permissions"`
	Priority    *int         `json:"priority"`
}

// UpdateRole updates an existing role
func (s *Service) UpdateRole(roleID string, req *UpdateRoleRequest) (*Role, error) {
	var role Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrRoleNotFound
		}
		return nil, err
	}

	// Cannot modify system roles' permissions
	if role.IsSystem && req.Permissions != nil {
		return nil, ErrSystemRoleModify
	}

	updates := make(map[string]interface{})
	if req.DisplayName != nil {
		updates["display_name"] = *req.DisplayName
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Permissions != nil {
		updates["permissions"] = *req.Permissions
	}
	if req.Priority != nil && !role.IsSystem {
		updates["priority"] = *req.Priority
	}

	if len(updates) > 0 {
		if err := s.db.Model(&role).Updates(updates).Error; err != nil {
			return nil, err
		}
		s.db.First(&role, "id = ?", roleID)
	}

	s.RecordAudit(AuditLog{
		Action:     "role_update",
		Resource:   "role",
		ResourceID: role.ID,
		NewValue:   JSON(updates),
		Status:     string(AuditStatusSuccess),
	})

	return &role, nil
}

// DeleteRole deletes a custom role
func (s *Service) DeleteRole(roleID string) error {
	var role Role
	if err := s.db.First(&role, "id = ?", roleID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrRoleNotFound
		}
		return err
	}

	// Cannot delete system roles
	if role.IsSystem {
		return ErrSystemRoleModify
	}

	// Check if role is in use
	var userCount int64
	s.db.Model(&User{}).Where("role = ?", role.Name).Count(&userCount)
	if userCount > 0 {
		return ErrRoleInUse
	}

	if err := s.db.Delete(&role).Error; err != nil {
		return err
	}

	s.RecordAudit(AuditLog{
		Action:     "role_delete",
		Resource:   "role",
		ResourceID: roleID,
		Details:    JSON{"name": role.Name},
		Status:     string(AuditStatusSuccess),
	})

	return nil
}

// GetRoleUsers returns users with a specific role
func (s *Service) GetRoleUsers(roleName string, page, pageSize int) ([]User, int64, error) {
	var users []User
	var total int64

	query := s.db.Model(&User{}).Where("role = ?", roleName)

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * pageSize
	if err := query.Offset(offset).Limit(pageSize).Order("created_at DESC").Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// AssignUserRole assigns a role to a user
func (s *Service) AssignUserRole(userID, roleName string, adminID string) error {
	// Verify role exists
	var role Role
	if err := s.db.First(&role, "name = ?", roleName).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrRoleNotFound
		}
		return err
	}

	// Get user
	var user User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return ErrUserNotFound
	}

	oldRole := user.Role

	// Update user role and permissions based on role
	if err := s.db.Model(&user).Updates(map[string]interface{}{
		"role":        roleName,
		"permissions": role.Permissions,
	}).Error; err != nil {
		return err
	}

	s.RecordAudit(AuditLog{
		UserID:     adminID,
		Action:     string(AuditActionRoleChange),
		Resource:   "user",
		ResourceID: userID,
		OldValue:   JSON{"role": oldRole},
		NewValue:   JSON{"role": roleName},
		Status:     string(AuditStatusSuccess),
	})

	return nil
}

// ============================================
// Permission Management
// ============================================

// ListPermissions returns all permissions
func (s *Service) ListPermissions() ([]Permission, error) {
	var permissions []Permission
	if err := s.db.Order("category, name").Find(&permissions).Error; err != nil {
		return nil, err
	}
	return permissions, nil
}

// GetPermissionsByCategory returns permissions grouped by category
func (s *Service) GetPermissionsByCategory() (map[string][]Permission, error) {
	permissions, err := s.ListPermissions()
	if err != nil {
		return nil, err
	}

	result := make(map[string][]Permission)
	for _, p := range permissions {
		result[p.Category] = append(result[p.Category], p)
	}
	return result, nil
}

// CheckUserPermission checks if a user has a specific permission
func (s *Service) CheckUserPermission(userID, permission string) (bool, error) {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return false, err
	}

	return user.HasPermission(permission), nil
}

// GetUserEffectivePermissions returns all effective permissions for a user
func (s *Service) GetUserEffectivePermissions(userID string) ([]string, error) {
	user, err := s.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	// Admin has all permissions
	if user.IsAdmin() {
		return []string{"*"}, nil
	}

	// Get role permissions
	role, err := s.GetRoleByName(user.Role)
	if err != nil {
		// If role not found, return user's direct permissions
		return user.Permissions, nil
	}

	// Merge role permissions with user-specific permissions
	permSet := make(map[string]bool)
	for _, p := range role.Permissions {
		permSet[p] = true
	}
	for _, p := range user.Permissions {
		permSet[p] = true
	}

	result := make([]string, 0, len(permSet))
	for p := range permSet {
		result = append(result, p)
	}

	return result, nil
}
