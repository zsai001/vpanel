package services

import (
	"github.com/vpanel/server/internal/config"
	"github.com/vpanel/server/internal/models"
	"github.com/vpanel/server/pkg/logger"
	"gorm.io/gorm"
)

// Container holds all services
type Container struct {
	DB     *gorm.DB
	Config *config.Config
	Log    *logger.Logger

	// Core services
	Auth    *AuthService
	User    *UserService
	Node    *NodeService
	Monitor *MonitorService

	// Feature services
	Docker   *DockerService
	Nginx    *NginxService
	Database *DatabaseService
	File     *FileService
	Terminal *TerminalService
	Cron     *CronService
	Firewall *FirewallService
	Software *SoftwareService

	// Support services
	Plugin       *PluginService
	Settings     *SettingsService
	Audit        *AuditService
	Notification *NotificationService
}

// NewContainer creates a new service container
func NewContainer(db *gorm.DB, cfg *config.Config, log *logger.Logger) *Container {
	c := &Container{
		DB:     db,
		Config: cfg,
		Log:    log,
	}

	// Initialize core services
	c.Auth = NewAuthService(db, cfg, log)
	c.User = NewUserService(db, log)
	c.Node = NewNodeService(db, log)
	c.Monitor = NewMonitorService(db, log)

	// Initialize feature services
	c.Docker = NewDockerService(db, log)
	c.Nginx = NewNginxService(db, log)
	c.Database = NewDatabaseService(db, log)
	c.File = NewFileService(db, cfg, log)
	c.Terminal = NewTerminalService(log)
	c.Cron = NewCronService(db, log)
	c.Firewall = NewFirewallService(db, log)
	c.Software = NewSoftwareService(db, log)

	// Initialize support services
	c.Plugin = NewPluginService(db, log)
	c.Settings = NewSettingsService(db, log)
	c.Audit = NewAuditService(db, log)
	c.Notification = NewNotificationService(db, log)

	return c
}

// ============================================
// Auth Service
// ============================================

// AuthService handles authentication
type AuthService struct {
	db     *gorm.DB
	config *config.Config
	log    *logger.Logger
}

// NewAuthService creates a new auth service
func NewAuthService(db *gorm.DB, cfg *config.Config, log *logger.Logger) *AuthService {
	return &AuthService{db: db, config: cfg, log: log}
}

// ValidateToken validates a JWT token
func (s *AuthService) ValidateToken(token string) (string, error) {
	// Implementation
	return "", nil
}

// ============================================
// User Service
// ============================================

// UserService handles user operations
type UserService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewUserService creates a new user service
func NewUserService(db *gorm.DB, log *logger.Logger) *UserService {
	return &UserService{db: db, log: log}
}

// ============================================
// Node Service
// ============================================

// NodeService manages server nodes
type NodeService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewNodeService creates a new node service
func NewNodeService(db *gorm.DB, log *logger.Logger) *NodeService {
	return &NodeService{db: db, log: log}
}

// ============================================
// Monitor Service
// ============================================

// MonitorService handles system monitoring
type MonitorService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewMonitorService creates a new monitor service
func NewMonitorService(db *gorm.DB, log *logger.Logger) *MonitorService {
	return &MonitorService{db: db, log: log}
}

// ============================================
// Docker Service
// ============================================

// DockerService manages Docker containers
type DockerService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewDockerService creates a new docker service
func NewDockerService(db *gorm.DB, log *logger.Logger) *DockerService {
	return &DockerService{db: db, log: log}
}

// ============================================
// Nginx Service
// ============================================

// NginxService manages Nginx configuration
type NginxService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewNginxService creates a new nginx service
func NewNginxService(db *gorm.DB, log *logger.Logger) *NginxService {
	return &NginxService{db: db, log: log}
}

// ============================================
// Database Service
// ============================================

// DatabaseService manages database servers
type DatabaseService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewDatabaseService creates a new database service
func NewDatabaseService(db *gorm.DB, log *logger.Logger) *DatabaseService {
	return &DatabaseService{db: db, log: log}
}

// ============================================
// File Service
// ============================================

// FileService handles file operations
type FileService struct {
	db     *gorm.DB
	config *config.Config
	log    *logger.Logger
}

// NewFileService creates a new file service
func NewFileService(db *gorm.DB, cfg *config.Config, log *logger.Logger) *FileService {
	return &FileService{db: db, config: cfg, log: log}
}

// ============================================
// Terminal Service
// ============================================

// TerminalService handles terminal sessions
type TerminalService struct {
	log *logger.Logger
}

// NewTerminalService creates a new terminal service
func NewTerminalService(log *logger.Logger) *TerminalService {
	return &TerminalService{log: log}
}

// ============================================
// Cron Service
// ============================================

// CronService manages cron jobs
type CronService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewCronService creates a new cron service
func NewCronService(db *gorm.DB, log *logger.Logger) *CronService {
	return &CronService{db: db, log: log}
}

// ============================================
// Firewall Service
// ============================================

// FirewallService manages firewall rules
type FirewallService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewFirewallService creates a new firewall service
func NewFirewallService(db *gorm.DB, log *logger.Logger) *FirewallService {
	return &FirewallService{db: db, log: log}
}

// GetStatus returns firewall status
func (s *FirewallService) GetStatus(nodeID string) (map[string]interface{}, error) {
	var enabledCount int64
	var totalCount int64

	query := s.db.Model(&models.FirewallRule{})
	if nodeID != "" {
		query = query.Where("node_id = ?", nodeID)
	}

	query.Where("enabled = ?", true).Count(&enabledCount)
	query.Count(&totalCount)

	// TODO: Get actual blocked IPs count from Fail2Ban or firewall logs
	blockedIPs := int64(0)

	return map[string]interface{}{
		"enabled":     enabledCount > 0,
		"activeRules": enabledCount,
		"blockedIPs":  blockedIPs,
	}, nil
}

// EnableFirewall enables firewall for a node
func (s *FirewallService) EnableFirewall(nodeID string) error {
	// TODO: Implement actual firewall enable logic via agent
	s.log.Info("Firewall enabled", "node_id", nodeID)
	return nil
}

// DisableFirewall disables firewall for a node
func (s *FirewallService) DisableFirewall(nodeID string) error {
	// TODO: Implement actual firewall disable logic via agent
	s.log.Info("Firewall disabled", "node_id", nodeID)
	return nil
}

// ListRules returns all firewall rules
func (s *FirewallService) ListRules(nodeID string) ([]models.FirewallRule, error) {
	var rules []models.FirewallRule
	query := s.db.Order("priority ASC, created_at DESC")

	if nodeID != "" {
		query = query.Where("node_id = ?", nodeID)
	}

	if err := query.Find(&rules).Error; err != nil {
		return nil, err
	}

	return rules, nil
}

// GetRule returns a firewall rule by ID
func (s *FirewallService) GetRule(id string) (*models.FirewallRule, error) {
	var rule models.FirewallRule
	if err := s.db.First(&rule, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &rule, nil
}

// CreateRule creates a new firewall rule
func (s *FirewallService) CreateRule(rule *models.FirewallRule) error {
	if err := s.db.Create(rule).Error; err != nil {
		return err
	}
	// TODO: Apply rule to actual firewall via agent
	s.log.Info("Firewall rule created", "rule_id", rule.ID, "node_id", rule.NodeID)
	return nil
}

// UpdateRule updates a firewall rule
func (s *FirewallService) UpdateRule(id string, updates map[string]interface{}) error {
	if err := s.db.Model(&models.FirewallRule{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return err
	}
	// TODO: Apply rule update to actual firewall via agent
	s.log.Info("Firewall rule updated", "rule_id", id)
	return nil
}

// DeleteRule deletes a firewall rule
func (s *FirewallService) DeleteRule(id string) error {
	if err := s.db.Delete(&models.FirewallRule{}, "id = ?", id).Error; err != nil {
		return err
	}
	// TODO: Remove rule from actual firewall via agent
	s.log.Info("Firewall rule deleted", "rule_id", id)
	return nil
}

// GetFail2BanStatus returns Fail2Ban status
func (s *FirewallService) GetFail2BanStatus(nodeID string) (map[string]interface{}, error) {
	// TODO: Get actual Fail2Ban status via agent
	return map[string]interface{}{
		"enabled":     false,
		"activeJails": 0,
		"bannedIPs":   0,
	}, nil
}

// ListFail2BanJails returns all Fail2Ban jails
func (s *FirewallService) ListFail2BanJails(nodeID string) ([]map[string]interface{}, error) {
	// TODO: Get actual Fail2Ban jails via agent
	return []map[string]interface{}{}, nil
}

// UnbanIP unbans an IP from a Fail2Ban jail
func (s *FirewallService) UnbanIP(jailName, ip, nodeID string) error {
	// TODO: Implement actual unban logic via agent
	s.log.Info("IP unbanned", "jail", jailName, "ip", ip, "node_id", nodeID)
	return nil
}

// ============================================
// Software Service
// ============================================

// SoftwareService manages software installation
type SoftwareService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewSoftwareService creates a new software service
func NewSoftwareService(db *gorm.DB, log *logger.Logger) *SoftwareService {
	return &SoftwareService{db: db, log: log}
}

// ============================================
// Plugin Service
// ============================================

// PluginService manages plugins
type PluginService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewPluginService creates a new plugin service
func NewPluginService(db *gorm.DB, log *logger.Logger) *PluginService {
	return &PluginService{db: db, log: log}
}

// ============================================
// Settings Service
// ============================================

// SettingsService manages system settings
type SettingsService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewSettingsService creates a new settings service
func NewSettingsService(db *gorm.DB, log *logger.Logger) *SettingsService {
	return &SettingsService{db: db, log: log}
}

// ============================================
// Audit Service
// ============================================

// AuditService handles audit logging
type AuditService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewAuditService creates a new audit service
func NewAuditService(db *gorm.DB, log *logger.Logger) *AuditService {
	return &AuditService{db: db, log: log}
}

// ============================================
// Notification Service
// ============================================

// NotificationService handles notifications
type NotificationService struct {
	db  *gorm.DB
	log *logger.Logger
}

// NewNotificationService creates a new notification service
func NewNotificationService(db *gorm.DB, log *logger.Logger) *NotificationService {
	return &NotificationService{db: db, log: log}
}
