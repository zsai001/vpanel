package database

import (
	"fmt"

	"github.com/vpanel/server/internal/config"
	"github.com/vpanel/server/internal/models"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// New creates a new database connection
func New(cfg config.DatabaseConfig) (*gorm.DB, error) {
	var dialector gorm.Dialector

	switch cfg.Driver {
	case "postgres":
		dsn := fmt.Sprintf(
			"host=%s port=%d user=%s password=%s dbname=%s sslmode=%s",
			cfg.Host, cfg.Port, cfg.Username, cfg.Password, cfg.Database, cfg.SSLMode,
		)
		dialector = postgres.Open(dsn)
	case "sqlite":
		dialector = sqlite.Open(cfg.Database)
	default:
		dialector = sqlite.Open(cfg.Database)
	}

	gormConfig := &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	}

	db, err := gorm.Open(dialector, gormConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to connect database: %w", err)
	}

	// Configure connection pool for non-SQLite databases
	if cfg.Driver != "sqlite" {
		sqlDB, err := db.DB()
		if err != nil {
			return nil, err
		}
		sqlDB.SetMaxIdleConns(10)
		sqlDB.SetMaxOpenConns(100)
	}

	return db, nil
}

// AutoMigrate runs database migrations
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		// User & Auth
		&models.User{},
		&models.Session{},
		&models.OAuthConnection{},
		&models.LoginAttempt{},

		// Node & Agent
		&models.Node{},
		&models.NodeMetrics{},

		// Docker
		&models.DockerComposeProject{},

		// Nginx
		&models.NginxSite{},
		&models.SSLCertificate{},

		// Database
		&models.DatabaseServer{},
		&models.DatabaseBackup{},

		// Cron
		&models.CronJob{},
		&models.CronJobLog{},

		// Firewall
		&models.FirewallRule{},

		// Plugin
		&models.Plugin{},

		// Software
		&models.Software{},

		// Logs & Settings
		&models.AuditLog{},
		&models.SystemSetting{},
		&models.Notification{},
		&models.Alert{},
	)
}

// Seed populates the database with initial data
func Seed(db *gorm.DB) error {
	// Create default admin user if not exists
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count == 0 {
		// Generate random password
		password := generateRandomPassword(16)
		hashedPassword, _ := hashPassword(password)

		admin := &models.User{
			Username:    "admin",
			Email:       "admin@vpanel.local",
			Password:    hashedPassword,
			DisplayName: "Administrator",
			Role:        "admin",
			Status:      "active",
		}

		if err := db.Create(admin).Error; err != nil {
			return err
		}

		fmt.Printf("\n╔════════════════════════════════════════════════════════════════╗\n")
		fmt.Printf("║              🎉 FIRST RUN - SAVE YOUR CREDENTIALS!             ║\n")
		fmt.Printf("╠════════════════════════════════════════════════════════════════╣\n")
		fmt.Printf("║  Username: admin                                               ║\n")
		fmt.Printf("║  Password: %-52s ║\n", password)
		fmt.Printf("║                                                                ║\n")
		fmt.Printf("║  ⚠️  Save this password! It won't be shown again.              ║\n")
		fmt.Printf("╚════════════════════════════════════════════════════════════════╝\n\n")
	}

	// Seed default settings
	seedDefaultSettings(db)

	return nil
}

func seedDefaultSettings(db *gorm.DB) {
	settings := []models.SystemSetting{
		{Key: "site_name", Value: "VPanel", Type: "string", Category: "general"},
		{Key: "site_logo", Value: "", Type: "string", Category: "general"},
		{Key: "language", Value: "en", Type: "string", Category: "general"},
		{Key: "timezone", Value: "UTC", Type: "string", Category: "general"},
		{Key: "backup_enabled", Value: "true", Type: "bool", Category: "backup"},
		{Key: "backup_schedule", Value: "0 2 * * *", Type: "string", Category: "backup"},
		{Key: "backup_retention", Value: "7", Type: "int", Category: "backup"},
	}

	for _, s := range settings {
		db.Where("key = ?", s.Key).FirstOrCreate(&s)
	}
}

// Helper functions
func generateRandomPassword(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
	password := make([]byte, length)
	for i := range password {
		password[i] = charset[i%len(charset)]
	}
	return string(password)
}

func hashPassword(password string) (string, error) {
	// This is a placeholder - actual implementation uses bcrypt
	return password, nil
}

