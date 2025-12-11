package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/vpanel/server/internal/config"
	"github.com/vpanel/server/internal/database"
	"github.com/vpanel/server/internal/handlers"
	"github.com/vpanel/server/internal/middleware"
	"github.com/vpanel/server/internal/plugin"
	"github.com/vpanel/server/internal/services"
	"github.com/vpanel/server/pkg/logger"

	"github.com/gin-gonic/gin"
)

// Version information (set via ldflags)
var (
	Version   = "dev"
	BuildTime = "unknown"
	GitCommit = "unknown"
)

func main() {
	// Handle command line arguments
	if len(os.Args) > 1 {
		switch os.Args[1] {
		case "version", "--version", "-v":
			fmt.Printf("VPanel Server v%s\n", Version)
			fmt.Printf("Build Time: %s\n", BuildTime)
			fmt.Printf("Git Commit: %s\n", GitCommit)
			os.Exit(0)
		case "--help", "-h":
			printHelp()
			os.Exit(0)
		}
	}

	// Initialize logger
	log := logger.New(logger.Config{
		Level:      "info",
		Format:     "json",
		OutputPath: "logs/vpanel.log",
	})
	defer log.Sync()

	log.Info("Starting VPanel Server",
		"version", Version,
		"build_time", BuildTime,
	)

	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration", "error", err)
	}

	// Initialize database
	db, err := database.New(cfg.Database)
	if err != nil {
		log.Fatal("Failed to connect to database", "error", err)
	}

	// Auto migrate database
	if err := database.AutoMigrate(db); err != nil {
		log.Fatal("Failed to migrate database", "error", err)
	}

	// Initialize services
	svc := services.NewContainer(db, cfg, log)

	// Initialize plugin system
	pluginManager := plugin.NewManager(plugin.Config{
		PluginDir:  cfg.Plugin.Directory,
		DataDir:    cfg.Plugin.DataDirectory,
		MarketURL:  cfg.Plugin.MarketURL,
		AutoUpdate: cfg.Plugin.AutoUpdate,
	}, log)

	// Load plugins
	if err := pluginManager.LoadAll(); err != nil {
		log.Warn("Some plugins failed to load", "error", err)
	}

	// Setup Gin
	if cfg.Server.Mode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.Logger(log))
	router.Use(middleware.CORS(cfg.Server.CORS))
	router.Use(middleware.RateLimit(cfg.Server.RateLimit))

	// Initialize handlers
	h := handlers.New(svc, log)

	// Setup routes
	setupRoutes(router, h, svc, pluginManager)

	// Serve static files (frontend)
	setupStatic(router, cfg.Server.WebDir)

	// Create HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.Port),
		Handler:      router,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		log.Info("Server starting",
			"port", cfg.Server.Port,
			"mode", cfg.Server.Mode,
		)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Failed to start server", "error", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info("Shutting down server...")

	// Graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Shutdown plugins
	pluginManager.UnloadAll()

	// Shutdown server
	if err := srv.Shutdown(ctx); err != nil {
		log.Error("Server forced to shutdown", "error", err)
	}

	log.Info("Server exited")
}

func setupRoutes(r *gin.Engine, h *handlers.Handler, svc *services.Container, pm *plugin.Manager) {
	// Health check
	r.GET("/health", h.HealthCheck)
	r.GET("/api/version", h.Version)

	// Public routes
	public := r.Group("/api")
	{
		// Authentication
		public.POST("/auth/login", h.Auth.Login)
		public.POST("/auth/register", h.Auth.Register)
		public.POST("/auth/refresh", h.Auth.RefreshToken)
		public.GET("/auth/oauth/:provider", h.Auth.OAuthStart)
		public.GET("/auth/oauth/:provider/callback", h.Auth.OAuthCallback)
	}

	// Protected routes
	api := r.Group("/api")
	api.Use(middleware.Auth(svc.Auth))
	{
		// User profile
		api.GET("/profile", h.Auth.Profile)
		api.PUT("/profile", h.Auth.UpdateProfile)
		api.POST("/auth/logout", h.Auth.Logout)
		api.POST("/auth/password", h.Auth.ChangePassword)
		api.POST("/auth/mfa/enable", h.Auth.EnableMFA)
		api.POST("/auth/mfa/disable", h.Auth.DisableMFA)

		// Dashboard
		api.GET("/dashboard", h.Dashboard.Overview)
		api.GET("/dashboard/stats", h.Dashboard.Stats)

		// System Monitor
		api.GET("/monitor/system", h.Monitor.SystemInfo)
		api.GET("/monitor/metrics", h.Monitor.Metrics)
		api.GET("/monitor/history/:metric", h.Monitor.History)
		api.GET("/monitor/processes", h.Monitor.Processes)
		api.POST("/monitor/process/:pid/kill", h.Monitor.KillProcess)

		// Docker Management
		docker := api.Group("/docker")
		{
			docker.GET("/info", h.Docker.Info)
			docker.GET("/containers", h.Docker.ListContainers)
			docker.POST("/containers", h.Docker.CreateContainer)
			docker.GET("/containers/:id", h.Docker.GetContainer)
			docker.DELETE("/containers/:id", h.Docker.RemoveContainer)
			docker.POST("/containers/:id/start", h.Docker.StartContainer)
			docker.POST("/containers/:id/stop", h.Docker.StopContainer)
			docker.POST("/containers/:id/restart", h.Docker.RestartContainer)
			docker.GET("/containers/:id/logs", h.Docker.ContainerLogs)
			docker.GET("/containers/:id/stats", h.Docker.ContainerStats)
			docker.GET("/containers/:id/terminal", h.Docker.ContainerTerminal)

			docker.GET("/images", h.Docker.ListImages)
			docker.POST("/images/pull", h.Docker.PullImage)
			docker.DELETE("/images/:id", h.Docker.RemoveImage)
			docker.POST("/images/build", h.Docker.BuildImage)

			docker.GET("/networks", h.Docker.ListNetworks)
			docker.POST("/networks", h.Docker.CreateNetwork)
			docker.DELETE("/networks/:id", h.Docker.RemoveNetwork)

			docker.GET("/volumes", h.Docker.ListVolumes)
			docker.POST("/volumes", h.Docker.CreateVolume)
			docker.DELETE("/volumes/:id", h.Docker.RemoveVolume)

			docker.GET("/compose", h.Docker.ListComposeProjects)
			docker.POST("/compose", h.Docker.CreateComposeProject)
			docker.DELETE("/compose/:id", h.Docker.RemoveComposeProject)
			docker.POST("/compose/:id/up", h.Docker.ComposeUp)
			docker.POST("/compose/:id/down", h.Docker.ComposeDown)
		}

		// Nginx Management
		nginx := api.Group("/nginx")
		{
			nginx.GET("/status", h.Nginx.Status)
			nginx.POST("/reload", h.Nginx.Reload)
			nginx.GET("/sites", h.Nginx.ListSites)
			nginx.POST("/sites", h.Nginx.CreateSite)
			nginx.GET("/sites/:id", h.Nginx.GetSite)
			nginx.PUT("/sites/:id", h.Nginx.UpdateSite)
			nginx.DELETE("/sites/:id", h.Nginx.DeleteSite)
			nginx.POST("/sites/:id/enable", h.Nginx.EnableSite)
			nginx.POST("/sites/:id/disable", h.Nginx.DisableSite)

			nginx.GET("/ssl/certificates", h.Nginx.ListCertificates)
			nginx.POST("/ssl/certificates", h.Nginx.CreateCertificate)
			nginx.DELETE("/ssl/certificates/:id", h.Nginx.DeleteCertificate)
			nginx.POST("/ssl/certificates/:id/renew", h.Nginx.RenewCertificate)

			nginx.GET("/logs/access", h.Nginx.AccessLogs)
			nginx.GET("/logs/error", h.Nginx.ErrorLogs)
			nginx.GET("/analytics", h.Nginx.Analytics)
		}

		// Database Management
		database := api.Group("/database")
		{
			database.GET("/servers", h.Database.ListServers)
			database.POST("/servers", h.Database.CreateServer)
			database.DELETE("/servers/:id", h.Database.DeleteServer)
			database.GET("/servers/:id/databases", h.Database.ListDatabases)
			database.POST("/servers/:id/databases", h.Database.CreateDatabase)
			database.DELETE("/servers/:id/databases/:db", h.Database.DeleteDatabase)

			database.GET("/servers/:id/users", h.Database.ListUsers)
			database.POST("/servers/:id/users", h.Database.CreateUser)
			database.DELETE("/servers/:id/users/:user", h.Database.DeleteUser)

			database.POST("/servers/:id/backup", h.Database.Backup)
			database.POST("/servers/:id/restore", h.Database.Restore)
			database.GET("/backups", h.Database.ListBackups)
		}

		// File Management
		files := api.Group("/files")
		{
			files.GET("/list", h.File.List)
			files.GET("/read", h.File.Read)
			files.POST("/write", h.File.Write)
			files.POST("/mkdir", h.File.Mkdir)
			files.POST("/rename", h.File.Rename)
			files.POST("/copy", h.File.Copy)
			files.POST("/move", h.File.Move)
			files.DELETE("/delete", h.File.Delete)
			files.POST("/upload", h.File.Upload)
			files.GET("/download", h.File.Download)
			files.POST("/compress", h.File.Compress)
			files.POST("/decompress", h.File.Decompress)
			files.GET("/permissions", h.File.GetPermissions)
			files.POST("/permissions", h.File.SetPermissions)
			files.GET("/search", h.File.Search)
		}

		// Terminal
		api.GET("/terminal/ws", h.Terminal.WebSocket)
		api.GET("/terminal/sessions", h.Terminal.ListSessions)
		api.DELETE("/terminal/sessions/:id", h.Terminal.CloseSession)

		// Cron Jobs
		cron := api.Group("/cron")
		{
			cron.GET("/jobs", h.Cron.ListJobs)
			cron.POST("/jobs", h.Cron.CreateJob)
			cron.GET("/jobs/:id", h.Cron.GetJob)
			cron.PUT("/jobs/:id", h.Cron.UpdateJob)
			cron.DELETE("/jobs/:id", h.Cron.DeleteJob)
			cron.POST("/jobs/:id/run", h.Cron.RunJob)
			cron.GET("/jobs/:id/logs", h.Cron.JobLogs)
		}

		// Firewall
		firewall := api.Group("/firewall")
		{
			firewall.GET("/status", h.Firewall.Status)
			firewall.POST("/enable", h.Firewall.Enable)
			firewall.POST("/disable", h.Firewall.Disable)
			firewall.GET("/rules", h.Firewall.ListRules)
			firewall.POST("/rules", h.Firewall.CreateRule)
			firewall.PUT("/rules/:id", h.Firewall.UpdateRule)
			firewall.DELETE("/rules/:id", h.Firewall.DeleteRule)
			firewall.GET("/fail2ban/status", h.Firewall.Fail2BanStatus)
			firewall.GET("/fail2ban/jails", h.Firewall.ListJails)
			firewall.POST("/fail2ban/jails/:name/unban", h.Firewall.UnbanIP)
		}

		// Software
		software := api.Group("/software")
		{
			software.GET("/installed", h.Software.ListInstalled)
			software.GET("/available", h.Software.ListAvailable)
			software.POST("/install", h.Software.Install)
			software.POST("/uninstall", h.Software.Uninstall)
			software.POST("/upgrade", h.Software.Upgrade)
			software.GET("/status/:name", h.Software.Status)
		}

		// Plugins
		plugins := api.Group("/plugins")
		{
			plugins.GET("/", h.Plugin.List)
			plugins.GET("/market", h.Plugin.Market)
			plugins.POST("/install", h.Plugin.Install)
			plugins.POST("/:id/uninstall", h.Plugin.Uninstall)
			plugins.POST("/:id/enable", h.Plugin.Enable)
			plugins.POST("/:id/disable", h.Plugin.Disable)
			plugins.GET("/:id/settings", h.Plugin.GetSettings)
			plugins.PUT("/:id/settings", h.Plugin.UpdateSettings)
		}

		// Logs
		logs := api.Group("/logs")
		{
			logs.GET("/system", h.Log.SystemLogs)
			logs.GET("/audit", h.Log.AuditLogs)
			logs.GET("/tasks", h.Log.TaskLogs)
		}

		// Settings
		settings := api.Group("/settings")
		{
			settings.GET("/", h.Settings.Get)
			settings.PUT("/", h.Settings.Update)
			settings.GET("/backup", h.Settings.GetBackupSettings)
			settings.PUT("/backup", h.Settings.UpdateBackupSettings)
			settings.GET("/notification", h.Settings.GetNotificationSettings)
			settings.PUT("/notification", h.Settings.UpdateNotificationSettings)
		}

		// Users (Admin only)
		users := api.Group("/users")
		users.Use(middleware.RequireRole("admin"))
		{
			users.GET("/", h.User.List)
			users.POST("/", h.User.Create)
			users.GET("/:id", h.User.Get)
			users.PUT("/:id", h.User.Update)
			users.DELETE("/:id", h.User.Delete)
			users.GET("/:id/permissions", h.User.GetPermissions)
			users.PUT("/:id/permissions", h.User.UpdatePermissions)
		}

		// Nodes (Multi-server management)
		nodes := api.Group("/nodes")
		{
			nodes.GET("/", h.Node.List)
			nodes.POST("/", h.Node.Add)
			nodes.GET("/:id", h.Node.Get)
			nodes.PUT("/:id", h.Node.Update)
			nodes.DELETE("/:id", h.Node.Delete)
			nodes.GET("/:id/status", h.Node.Status)
			nodes.POST("/:id/command", h.Node.ExecuteCommand)
		}
	}

	// Plugin API routes (dynamically registered)
	pluginAPI := r.Group("/api/plugin")
	pluginAPI.Use(middleware.Auth(svc.Auth))
	pm.RegisterRoutes(pluginAPI)

	// WebSocket endpoints
	ws := r.Group("/ws")
	{
		ws.GET("/terminal", h.Terminal.WebSocket)
		ws.GET("/docker/logs/:id", h.Docker.ContainerLogsWS)
		ws.GET("/docker/stats/:id", h.Docker.ContainerStatsWS)
		ws.GET("/monitor", h.Monitor.RealtimeWS)
	}

	// Agent WebSocket
	r.GET("/ws/agent", h.Agent.WebSocket)
}

func setupStatic(r *gin.Engine, webDir string) {
	// Try to find web directory
	paths := []string{
		webDir,
		"./web/dist",
		"../web/dist",
		"/opt/vpanel/web",
	}

	for _, p := range paths {
		if _, err := os.Stat(p + "/index.html"); err == nil {
			r.Static("/assets", p+"/assets")
			r.StaticFile("/favicon.ico", p+"/favicon.ico")
			r.NoRoute(func(c *gin.Context) {
				c.File(p + "/index.html")
			})
			return
		}
	}

	// Fallback to embedded HTML
	r.NoRoute(func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html", []byte(embeddedHTML))
	})
}

func printHelp() {
	fmt.Println(`VPanel Server - Enterprise Server Management Panel

Usage:
  vpanel-server [command]

Commands:
  (none)           Start the server
  version          Show version information
  --help, -h       Show this help message

Environment Variables:
  VPANEL_CONFIG    Path to config file (default: config.yaml)
  VPANEL_PORT      Server port (default: 8080)
  VPANEL_MODE      Server mode: debug, release (default: debug)

For more information, visit: https://vpanel.io/docs`)
}

const embeddedHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VPanel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
            color: #f1f5f9;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container { text-align: center; padding: 2rem; }
        h1 {
            font-size: 4rem;
            margin-bottom: 1rem;
            background: linear-gradient(90deg, #06b6d4, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        p { color: #94a3b8; font-size: 1.2rem; }
        .status {
            background: rgba(6, 182, 212, 0.1);
            border: 1px solid rgba(6, 182, 212, 0.3);
            border-radius: 16px;
            padding: 2rem;
            margin-top: 2rem;
        }
        .badge {
            display: inline-block;
            background: linear-gradient(90deg, #06b6d4, #8b5cf6);
            padding: 0.5rem 1rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="badge">Server Running</div>
        <h1>VPanel</h1>
        <p>Enterprise Server Management Platform</p>
        <div class="status">
            <h3>API Available</h3>
            <p>Frontend assets not found. API is accessible at /api</p>
        </div>
    </div>
</body>
</html>`
