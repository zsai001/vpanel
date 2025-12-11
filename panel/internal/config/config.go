package config

import (
	"os"
	"path/filepath"
	"strings"

	"github.com/spf13/viper"
)

// Config holds all configuration for the server
type Config struct {
	Server   ServerConfig   `mapstructure:"server"`
	Database DatabaseConfig `mapstructure:"database"`
	Auth     AuthConfig     `mapstructure:"auth"`
	Plugin   PluginConfig   `mapstructure:"plugin"`
	Storage  StorageConfig  `mapstructure:"storage"`
	Logging  LoggingConfig  `mapstructure:"logging"`
}

// ServerConfig holds HTTP server configuration
type ServerConfig struct {
	Port      int              `mapstructure:"port"`
	Mode      string           `mapstructure:"mode"`
	WebDir    string           `mapstructure:"web_dir"`
	CORS      CORSConfig       `mapstructure:"cors"`
	RateLimit RateLimitConfig  `mapstructure:"rate_limit"`
	TLS       TLSConfig        `mapstructure:"tls"`
}

// CORSConfig holds CORS configuration
type CORSConfig struct {
	Enabled        bool     `mapstructure:"enabled"`
	AllowedOrigins []string `mapstructure:"allowed_origins"`
	AllowedMethods []string `mapstructure:"allowed_methods"`
	AllowedHeaders []string `mapstructure:"allowed_headers"`
}

// RateLimitConfig holds rate limiting configuration
type RateLimitConfig struct {
	Enabled  bool `mapstructure:"enabled"`
	Requests int  `mapstructure:"requests"`
	Window   int  `mapstructure:"window"` // seconds
}

// TLSConfig holds TLS configuration
type TLSConfig struct {
	Enabled  bool   `mapstructure:"enabled"`
	CertFile string `mapstructure:"cert_file"`
	KeyFile  string `mapstructure:"key_file"`
}

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Driver   string `mapstructure:"driver"` // sqlite, postgres
	Host     string `mapstructure:"host"`
	Port     int    `mapstructure:"port"`
	Database string `mapstructure:"database"`
	Username string `mapstructure:"username"`
	Password string `mapstructure:"password"`
	SSLMode  string `mapstructure:"ssl_mode"`
}

// DSN returns the database connection string
func (c *DatabaseConfig) DSN() string {
	switch c.Driver {
	case "postgres":
		return "host=" + c.Host +
			" port=" + string(rune(c.Port)) +
			" user=" + c.Username +
			" password=" + c.Password +
			" dbname=" + c.Database +
			" sslmode=" + c.SSLMode
	case "sqlite":
		return c.Database
	default:
		return c.Database
	}
}

// AuthConfig holds authentication configuration
type AuthConfig struct {
	JWTSecret        string       `mapstructure:"jwt_secret"`
	TokenExpiry      int          `mapstructure:"token_expiry"`       // minutes
	RefreshExpiry    int          `mapstructure:"refresh_expiry"`     // days
	SessionTimeout   int          `mapstructure:"session_timeout"`    // minutes
	MaxLoginAttempts int          `mapstructure:"max_login_attempts"`
	LockoutDuration  int          `mapstructure:"lockout_duration"`   // minutes
	OAuth            OAuthConfig  `mapstructure:"oauth"`
}

// OAuthConfig holds OAuth provider configuration
type OAuthConfig struct {
	GitHub OAuthProviderConfig `mapstructure:"github"`
	Google OAuthProviderConfig `mapstructure:"google"`
}

// OAuthProviderConfig holds configuration for an OAuth provider
type OAuthProviderConfig struct {
	Enabled      bool   `mapstructure:"enabled"`
	ClientID     string `mapstructure:"client_id"`
	ClientSecret string `mapstructure:"client_secret"`
	RedirectURL  string `mapstructure:"redirect_url"`
}

// PluginConfig holds plugin system configuration
type PluginConfig struct {
	Directory     string `mapstructure:"directory"`
	DataDirectory string `mapstructure:"data_directory"`
	MarketURL     string `mapstructure:"market_url"`
	AutoUpdate    bool   `mapstructure:"auto_update"`
}

// StorageConfig holds storage configuration
type StorageConfig struct {
	DataDir   string `mapstructure:"data_dir"`
	TempDir   string `mapstructure:"temp_dir"`
	BackupDir string `mapstructure:"backup_dir"`
	LogDir    string `mapstructure:"log_dir"`
}

// LoggingConfig holds logging configuration
type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"` // json, console
	Output string `mapstructure:"output"` // stdout, file
}

// Load loads the configuration from file and environment
func Load() (*Config, error) {
	v := viper.New()

	// Set default values
	setDefaults(v)

	// Config file
	configPath := os.Getenv("VPANEL_CONFIG")
	if configPath == "" {
		configPath = "config.yaml"
	}

	v.SetConfigFile(configPath)
	v.SetConfigType("yaml")

	// Read config file (optional)
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			// Config file was found but another error was produced
			return nil, err
		}
		// Config file not found; use defaults
	}

	// Environment variables
	v.SetEnvPrefix("VPANEL")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Override with specific env vars
	bindEnvVars(v)

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, err
	}

	// Ensure directories exist
	ensureDirectories(&cfg)

	return &cfg, nil
}

func setDefaults(v *viper.Viper) {
	// Server defaults
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.mode", "debug")
	v.SetDefault("server.web_dir", "./web/dist")
	v.SetDefault("server.cors.enabled", true)
	v.SetDefault("server.cors.allowed_origins", []string{"*"})
	v.SetDefault("server.cors.allowed_methods", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	v.SetDefault("server.cors.allowed_headers", []string{"*"})
	v.SetDefault("server.rate_limit.enabled", true)
	v.SetDefault("server.rate_limit.requests", 100)
	v.SetDefault("server.rate_limit.window", 60)

	// Database defaults
	v.SetDefault("database.driver", "sqlite")
	v.SetDefault("database.database", "./data/vpanel.db")

	// Auth defaults
	v.SetDefault("auth.token_expiry", 60)      // 1 hour
	v.SetDefault("auth.refresh_expiry", 7)     // 7 days
	v.SetDefault("auth.session_timeout", 30)   // 30 minutes
	v.SetDefault("auth.max_login_attempts", 5)
	v.SetDefault("auth.lockout_duration", 15)  // 15 minutes

	// Plugin defaults
	v.SetDefault("plugin.directory", "./plugins")
	v.SetDefault("plugin.data_directory", "./data/plugins")
	v.SetDefault("plugin.market_url", "https://market.vpanel.io")
	v.SetDefault("plugin.auto_update", false)

	// Storage defaults
	v.SetDefault("storage.data_dir", "./data")
	v.SetDefault("storage.temp_dir", "./data/temp")
	v.SetDefault("storage.backup_dir", "./data/backups")
	v.SetDefault("storage.log_dir", "./logs")

	// Logging defaults
	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.format", "json")
	v.SetDefault("logging.output", "stdout")
}

func bindEnvVars(v *viper.Viper) {
	v.BindEnv("server.port", "VPANEL_PORT")
	v.BindEnv("server.mode", "VPANEL_MODE")
	v.BindEnv("database.driver", "VPANEL_DB_DRIVER")
	v.BindEnv("database.host", "VPANEL_DB_HOST")
	v.BindEnv("database.port", "VPANEL_DB_PORT")
	v.BindEnv("database.database", "VPANEL_DB_NAME")
	v.BindEnv("database.username", "VPANEL_DB_USER")
	v.BindEnv("database.password", "VPANEL_DB_PASSWORD")
	v.BindEnv("auth.jwt_secret", "VPANEL_JWT_SECRET")
}

func ensureDirectories(cfg *Config) {
	dirs := []string{
		cfg.Storage.DataDir,
		cfg.Storage.TempDir,
		cfg.Storage.BackupDir,
		cfg.Storage.LogDir,
		cfg.Plugin.Directory,
		cfg.Plugin.DataDirectory,
		filepath.Dir(cfg.Database.Database),
	}

	for _, dir := range dirs {
		if dir != "" {
			os.MkdirAll(dir, 0755)
		}
	}
}

