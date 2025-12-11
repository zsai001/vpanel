package plugin

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"plugin"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/vpanel/server/pkg/logger"
)

// Config holds plugin manager configuration
type Config struct {
	PluginDir  string
	DataDir    string
	MarketURL  string
	AutoUpdate bool
}

// Manager manages plugin lifecycle
type Manager struct {
	config  Config
	plugins map[string]*LoadedPlugin
	mu      sync.RWMutex
	log     *logger.Logger
}

// LoadedPlugin represents a loaded plugin
type LoadedPlugin struct {
	Manifest  *Manifest
	Instance  Plugin
	Enabled   bool
	DataDir   string
	ConfigDir string
}

// Manifest describes a plugin
type Manifest struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	Version      string            `json:"version"`
	Description  string            `json:"description"`
	Author       string            `json:"author"`
	Homepage     string            `json:"homepage"`
	License      string            `json:"license"`
	Icon         string            `json:"icon"`
	Category     string            `json:"category"`
	Tags         []string          `json:"tags"`
	Dependencies []string          `json:"dependencies"`
	Permissions  []string          `json:"permissions"`
	MinVersion   string            `json:"min_version"`
	Settings     []SettingDef      `json:"settings"`
	Routes       []RouteDef        `json:"routes"`
	Menus        []MenuDef         `json:"menus"`
}

// SettingDef defines a plugin setting
type SettingDef struct {
	Key         string      `json:"key"`
	Type        string      `json:"type"` // string, int, bool, select, textarea
	Label       string      `json:"label"`
	Description string      `json:"description"`
	Default     interface{} `json:"default"`
	Required    bool        `json:"required"`
	Options     []SelectOption `json:"options,omitempty"`
}

// SelectOption defines a select option
type SelectOption struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// RouteDef defines a plugin route
type RouteDef struct {
	Method      string `json:"method"`
	Path        string `json:"path"`
	Handler     string `json:"handler"`
	Description string `json:"description"`
}

// MenuDef defines a plugin menu item
type MenuDef struct {
	Title    string    `json:"title"`
	Icon     string    `json:"icon"`
	Path     string    `json:"path"`
	Order    int       `json:"order"`
	Parent   string    `json:"parent,omitempty"`
	Children []MenuDef `json:"children,omitempty"`
}

// Plugin interface that all plugins must implement
type Plugin interface {
	// Initialize is called when the plugin is loaded
	Initialize(ctx *PluginContext) error

	// Start is called when the plugin is enabled
	Start() error

	// Stop is called when the plugin is disabled
	Stop() error

	// Shutdown is called when the plugin is unloaded
	Shutdown() error

	// GetInfo returns plugin information
	GetInfo() *Info

	// GetRoutes returns the plugin's HTTP routes
	GetRoutes() []Route

	// HandleEvent handles events from the system
	HandleEvent(event Event) error
}

// PluginContext provides context to plugins
type PluginContext struct {
	PluginID  string
	DataDir   string
	ConfigDir string
	Logger    *logger.Logger
	API       *PluginAPI
}

// PluginAPI provides API access to plugins
type PluginAPI struct {
	// Database operations
	GetSetting   func(key string) (string, error)
	SetSetting   func(key, value string) error
	
	// File operations
	ReadFile     func(path string) ([]byte, error)
	WriteFile    func(path string, data []byte) error
	
	// HTTP client
	HTTPGet      func(url string) ([]byte, error)
	HTTPPost     func(url string, body []byte) ([]byte, error)
	
	// Notifications
	SendNotification func(title, message string) error
	
	// Execute commands
	Execute      func(command string, args ...string) (string, error)
}

// Info contains plugin information
type Info struct {
	ID          string
	Name        string
	Version     string
	Description string
	Author      string
	Status      string // running, stopped, error
}

// Route defines an HTTP route
type Route struct {
	Method  string
	Path    string
	Handler gin.HandlerFunc
}

// Event represents a system event
type Event struct {
	Type    string
	Payload interface{}
}

// NewManager creates a new plugin manager
func NewManager(cfg Config, log *logger.Logger) *Manager {
	return &Manager{
		config:  cfg,
		plugins: make(map[string]*LoadedPlugin),
		log:     log,
	}
}

// LoadAll loads all plugins from the plugin directory
func (m *Manager) LoadAll() error {
	entries, err := os.ReadDir(m.config.PluginDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	var loadErrors []error
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		pluginPath := filepath.Join(m.config.PluginDir, entry.Name())
		if err := m.Load(pluginPath); err != nil {
			loadErrors = append(loadErrors, fmt.Errorf("failed to load plugin %s: %w", entry.Name(), err))
			m.log.Warn("Failed to load plugin", "plugin", entry.Name(), "error", err)
		}
	}

	if len(loadErrors) > 0 {
		return fmt.Errorf("%d plugins failed to load", len(loadErrors))
	}

	return nil
}

// Load loads a plugin from the specified path
func (m *Manager) Load(path string) error {
	// Read manifest
	manifestPath := filepath.Join(path, "manifest.json")
	manifestData, err := os.ReadFile(manifestPath)
	if err != nil {
		return fmt.Errorf("failed to read manifest: %w", err)
	}

	var manifest Manifest
	if err := json.Unmarshal(manifestData, &manifest); err != nil {
		return fmt.Errorf("failed to parse manifest: %w", err)
	}

	// Check if plugin is already loaded
	m.mu.Lock()
	defer m.mu.Unlock()

	if _, exists := m.plugins[manifest.ID]; exists {
		return fmt.Errorf("plugin %s is already loaded", manifest.ID)
	}

	// Load the plugin binary
	pluginPath := filepath.Join(path, manifest.ID+".so")
	p, err := plugin.Open(pluginPath)
	if err != nil {
		// Plugin binary not found, might be a script-only plugin
		m.log.Debug("No binary found for plugin", "plugin", manifest.ID)
	}

	// Look for the Plugin symbol
	var instance Plugin
	if p != nil {
		sym, err := p.Lookup("Plugin")
		if err != nil {
			return fmt.Errorf("plugin does not export Plugin symbol: %w", err)
		}

		var ok bool
		instance, ok = sym.(Plugin)
		if !ok {
			return fmt.Errorf("Plugin symbol is not of type Plugin")
		}
	}

	// Create plugin data directory
	dataDir := filepath.Join(m.config.DataDir, manifest.ID)
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return fmt.Errorf("failed to create data directory: %w", err)
	}

	// Create plugin context
	ctx := &PluginContext{
		PluginID:  manifest.ID,
		DataDir:   dataDir,
		ConfigDir: path,
		Logger:    m.log,
		API:       m.createPluginAPI(manifest.ID),
	}

	// Initialize plugin
	if instance != nil {
		if err := instance.Initialize(ctx); err != nil {
			return fmt.Errorf("failed to initialize plugin: %w", err)
		}
	}

	// Store loaded plugin
	m.plugins[manifest.ID] = &LoadedPlugin{
		Manifest:  &manifest,
		Instance:  instance,
		Enabled:   true,
		DataDir:   dataDir,
		ConfigDir: path,
	}

	m.log.Info("Plugin loaded", "plugin", manifest.ID, "version", manifest.Version)
	return nil
}

// Unload unloads a plugin
func (m *Manager) Unload(pluginID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	lp, exists := m.plugins[pluginID]
	if !exists {
		return fmt.Errorf("plugin %s is not loaded", pluginID)
	}

	if lp.Instance != nil {
		if err := lp.Instance.Shutdown(); err != nil {
			m.log.Warn("Plugin shutdown error", "plugin", pluginID, "error", err)
		}
	}

	delete(m.plugins, pluginID)
	m.log.Info("Plugin unloaded", "plugin", pluginID)
	return nil
}

// UnloadAll unloads all plugins
func (m *Manager) UnloadAll() {
	m.mu.Lock()
	defer m.mu.Unlock()

	for id, lp := range m.plugins {
		if lp.Instance != nil {
			if err := lp.Instance.Shutdown(); err != nil {
				m.log.Warn("Plugin shutdown error", "plugin", id, "error", err)
			}
		}
	}

	m.plugins = make(map[string]*LoadedPlugin)
	m.log.Info("All plugins unloaded")
}

// Enable enables a plugin
func (m *Manager) Enable(pluginID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	lp, exists := m.plugins[pluginID]
	if !exists {
		return fmt.Errorf("plugin %s is not loaded", pluginID)
	}

	if lp.Enabled {
		return nil
	}

	if lp.Instance != nil {
		if err := lp.Instance.Start(); err != nil {
			return fmt.Errorf("failed to start plugin: %w", err)
		}
	}

	lp.Enabled = true
	m.log.Info("Plugin enabled", "plugin", pluginID)
	return nil
}

// Disable disables a plugin
func (m *Manager) Disable(pluginID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	lp, exists := m.plugins[pluginID]
	if !exists {
		return fmt.Errorf("plugin %s is not loaded", pluginID)
	}

	if !lp.Enabled {
		return nil
	}

	if lp.Instance != nil {
		if err := lp.Instance.Stop(); err != nil {
			return fmt.Errorf("failed to stop plugin: %w", err)
		}
	}

	lp.Enabled = false
	m.log.Info("Plugin disabled", "plugin", pluginID)
	return nil
}

// Get returns a loaded plugin
func (m *Manager) Get(pluginID string) (*LoadedPlugin, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	lp, exists := m.plugins[pluginID]
	return lp, exists
}

// List returns all loaded plugins
func (m *Manager) List() []*LoadedPlugin {
	m.mu.RLock()
	defer m.mu.RUnlock()

	result := make([]*LoadedPlugin, 0, len(m.plugins))
	for _, lp := range m.plugins {
		result = append(result, lp)
	}
	return result
}

// RegisterRoutes registers plugin routes to the router
func (m *Manager) RegisterRoutes(rg *gin.RouterGroup) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, lp := range m.plugins {
		if !lp.Enabled || lp.Instance == nil {
			continue
		}

		routes := lp.Instance.GetRoutes()
		pluginGroup := rg.Group("/" + lp.Manifest.ID)

		for _, route := range routes {
			switch route.Method {
			case "GET":
				pluginGroup.GET(route.Path, route.Handler)
			case "POST":
				pluginGroup.POST(route.Path, route.Handler)
			case "PUT":
				pluginGroup.PUT(route.Path, route.Handler)
			case "DELETE":
				pluginGroup.DELETE(route.Path, route.Handler)
			}
		}
	}
}

// BroadcastEvent sends an event to all plugins
func (m *Manager) BroadcastEvent(event Event) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, lp := range m.plugins {
		if !lp.Enabled || lp.Instance == nil {
			continue
		}

		go func(p *LoadedPlugin) {
			if err := p.Instance.HandleEvent(event); err != nil {
				m.log.Warn("Plugin event handler error",
					"plugin", p.Manifest.ID,
					"event", event.Type,
					"error", err,
				)
			}
		}(lp)
	}
}

// createPluginAPI creates the API object for a plugin
func (m *Manager) createPluginAPI(pluginID string) *PluginAPI {
	return &PluginAPI{
		GetSetting: func(key string) (string, error) {
			// Implementation would interact with the database
			return "", nil
		},
		SetSetting: func(key, value string) error {
			return nil
		},
		ReadFile: func(path string) ([]byte, error) {
			return os.ReadFile(path)
		},
		WriteFile: func(path string, data []byte) error {
			return os.WriteFile(path, data, 0644)
		},
		HTTPGet: func(url string) ([]byte, error) {
			return nil, nil
		},
		HTTPPost: func(url string, body []byte) ([]byte, error) {
			return nil, nil
		},
		SendNotification: func(title, message string) error {
			return nil
		},
		Execute: func(command string, args ...string) (string, error) {
			return "", nil
		},
	}
}

