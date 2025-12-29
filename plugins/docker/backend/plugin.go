package docker

import (
	"github.com/gin-gonic/gin"
	sdk "github.com/vpanel/sdk"
	"gorm.io/gorm"
)

// Plugin is the Docker management plugin
type Plugin struct {
	sdk.BaseBuiltinPlugin
	service *Service
}

// NewPlugin creates a new Docker plugin
func NewPlugin() *Plugin {
	return &Plugin{}
}

// ID returns the plugin ID
func (p *Plugin) ID() string {
	return "docker"
}

// Name returns the plugin name
func (p *Plugin) Name() string {
	return "Docker Management"
}

// Version returns the plugin version
func (p *Plugin) Version() string {
	return "1.0.0"
}

// Description returns the plugin description
func (p *Plugin) Description() string {
	return "Docker containers, images, networks and volumes management"
}

// Dependencies returns plugin dependencies
func (p *Plugin) Dependencies() []string {
	return nil
}

// Init initializes the plugin
func (p *Plugin) Init(ctx *sdk.PluginContext) error {
	p.BaseBuiltinPlugin.Init(ctx)
	p.service = NewService(ctx.DB(), ctx.Logger())
	return nil
}

// Stop cleans up plugin resources
func (p *Plugin) Stop() error {
	if p.service != nil {
		p.service.Close()
	}
	return nil
}

// Migrate runs database migrations
func (p *Plugin) Migrate(db *gorm.DB) error {
	return db.AutoMigrate(&DockerComposeProject{})
}

// RegisterRoutes registers the plugin routes
func (p *Plugin) RegisterRoutes(rg *gin.RouterGroup) {
	docker := rg.Group("/docker")
	{
		docker.GET("/info", p.getInfo)

		// Containers
		docker.GET("/containers", p.listContainers)
		docker.POST("/containers", p.createContainer)
		docker.GET("/containers/:id", p.getContainer)
		docker.DELETE("/containers/:id", p.removeContainer)
		docker.POST("/containers/:id/start", p.startContainer)
		docker.POST("/containers/:id/stop", p.stopContainer)
		docker.POST("/containers/:id/restart", p.restartContainer)
		docker.GET("/containers/:id/logs", p.containerLogs)
		docker.GET("/containers/:id/logs/stream", p.containerLogsStream)
		docker.GET("/containers/:id/stats", p.containerStats)
		docker.GET("/containers/:id/exec", p.containerExec)
		
		// Container file browser
		docker.GET("/containers/:id/files", p.listContainerFiles)
		docker.GET("/containers/:id/files/download", p.downloadContainerFile)
		docker.GET("/containers/:id/files/content", p.getContainerFileContent)
		docker.POST("/containers/:id/files/upload", p.uploadContainerFile)
		docker.DELETE("/containers/:id/files", p.deleteContainerFile)
		docker.POST("/containers/:id/files/mkdir", p.createContainerDirectory)

		// Images
		docker.GET("/images", p.listImages)
		docker.POST("/images/pull", p.pullImage)
		docker.DELETE("/images/:id", p.removeImage)

		// Networks
		docker.GET("/networks", p.listNetworks)
		docker.POST("/networks", p.createNetwork)
		docker.DELETE("/networks/:id", p.removeNetwork)

		// Volumes
		docker.GET("/volumes", p.listVolumes)
		docker.POST("/volumes", p.createVolume)
		docker.DELETE("/volumes/:id", p.removeVolume)

		// Compose
		docker.GET("/compose", p.listComposeProjects)
		docker.POST("/compose", p.createComposeProject)
		docker.DELETE("/compose/:id", p.removeComposeProject)
		docker.POST("/compose/:id/up", p.composeUp)
		docker.POST("/compose/:id/down", p.composeDown)
	}
}

// GetMenuItems returns menu items for this plugin
func (p *Plugin) GetMenuItems() []sdk.MenuItem {
	return []sdk.MenuItem{
		{
			ID:    "docker",
			Title: "Docker",
			Icon:  "container",
			Path:  "/docker",
			Order: 10,
			Children: []sdk.MenuItem{
				{ID: "docker-containers", Title: "Containers", Path: "/docker/containers", Order: 0},
				{ID: "docker-images", Title: "Images", Path: "/docker/images", Order: 1},
				{ID: "docker-networks", Title: "Networks", Path: "/docker/networks", Order: 2},
				{ID: "docker-volumes", Title: "Volumes", Path: "/docker/volumes", Order: 3},
				{ID: "docker-compose", Title: "Compose", Path: "/docker/compose", Order: 4},
			},
		},
	}
}

// GetFrontendRoutes returns frontend routes for this plugin
func (p *Plugin) GetFrontendRoutes() []sdk.FrontendRoute {
	return []sdk.FrontendRoute{
		{Path: "/docker/containers", Component: "docker/frontend/pages/Containers", Title: "Containers"},
		{Path: "/docker/containers/:id", Component: "docker/frontend/pages/ContainerDetail", Title: "Container Details"},
		{Path: "/docker/images", Component: "docker/frontend/pages/Images", Title: "Images"},
		{Path: "/docker/networks", Component: "docker/frontend/pages/Networks", Title: "Networks"},
		{Path: "/docker/volumes", Component: "docker/frontend/pages/Volumes", Title: "Volumes"},
		{Path: "/docker/compose", Component: "docker/frontend/pages/Compose", Title: "Compose"},
	}
}
