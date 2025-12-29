package docker

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DockerComposeProject represents a Docker Compose project
type DockerComposeProject struct {
	ID          string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	Name        string         `gorm:"type:varchar(100);not null" json:"name"`
	Path        string         `gorm:"type:varchar(500)" json:"path"`
	Content     string         `gorm:"type:text" json:"content"`
	Status      string         `gorm:"type:varchar(20);default:'stopped'" json:"status"`
	Description string         `gorm:"type:varchar(500)" json:"description"`
}

// BeforeCreate generates UUID before creating record
func (m *DockerComposeProject) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.New().String()
	}
	return nil
}

// ContainerInfo represents container information
type ContainerInfo struct {
	ID      string            `json:"id"`
	Name    string            `json:"name"`
	Image   string            `json:"image"`
	Status  string            `json:"status"`
	State   string            `json:"state"`
	Created string            `json:"created"`
	Ports   []string          `json:"ports"`
	Network string            `json:"network"`
	Command string            `json:"command"`
	Size    string            `json:"size"`
	Labels  map[string]string `json:"labels"`
	CPU     float64           `json:"cpu"`
	Memory  *MemoryInfo       `json:"memory"`
}

// MemoryInfo represents memory usage
type MemoryInfo struct {
	Used  float64 `json:"used"`
	Limit float64 `json:"limit"`
}

// ImageInfo represents image information
type ImageInfo struct {
	ID      string   `json:"id"`
	Tags    []string `json:"tags"`
	Size    int64    `json:"size"`
	Created string   `json:"created"`
}

// NetworkInfo represents network information
type NetworkInfo struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Driver     string `json:"driver"`
	Scope      string `json:"scope"`
	Containers int    `json:"containers"`
}

// VolumeInfo represents volume information
type VolumeInfo struct {
	Name       string `json:"name"`
	Driver     string `json:"driver"`
	Mountpoint string `json:"mountpoint"`
	CreatedAt  string `json:"created_at"`
}

// CreateContainerRequest represents container creation request
type CreateContainerRequest struct {
	Name        string            `json:"name" binding:"required"`
	Image       string            `json:"image" binding:"required"`
	Ports       map[string]string `json:"ports"`
	Environment []string          `json:"environment"`
	Volumes     []string          `json:"volumes"`
	Network     string            `json:"network"`
	Command     []string          `json:"command"`
	Restart     string            `json:"restart"`
}

// ComposeProjectInfo represents a detected or registered compose project
type ComposeProjectInfo struct {
	ID             string               `json:"id"`
	Name           string               `json:"name"`
	Path           string               `json:"path"`
	ConfigFiles    string               `json:"config_files,omitempty"`
	Description    string               `json:"description,omitempty"`
	Status         string               `json:"status"` // running, stopped, partial
	ContainerCount int                  `json:"container_count"`
	RunningCount   int                  `json:"running_count"`
	StoppedCount   int                  `json:"stopped_count"`
	Services       []ComposeServiceInfo `json:"services"`
	CreatedAt      string               `json:"created_at"`
	UpdatedAt      string               `json:"updated_at"`
	IsAutoDetected bool                 `json:"is_auto_detected"`
}

// ComposeServiceInfo represents a service within a compose project
type ComposeServiceInfo struct {
	Name            string   `json:"name"`
	ContainerID     string   `json:"container_id"`
	ContainerName   string   `json:"container_name"`
	ContainerNumber string   `json:"container_number,omitempty"`
	Image           string   `json:"image"`
	State           string   `json:"state"`
	Status          string   `json:"status"`
	Ports           []string `json:"ports"`
}

// ContainerGroup represents a group of containers (by compose project or status)
type ContainerGroup struct {
	Type        string          `json:"type"`        // "compose" or "standalone" or "status"
	Name        string          `json:"name"`        // Project name or status name
	Path        string          `json:"path,omitempty"`
	Status      string          `json:"status"`      // overall status: running, stopped, partial
	Count       int             `json:"count"`      // total containers
	Running     int             `json:"running"`    // running containers
	Stopped     int             `json:"stopped"`    // stopped containers
	Containers  []ContainerInfo `json:"containers"`
	IsCompose   bool            `json:"is_compose"`
}

// GroupedContainersResponse represents grouped containers response
type GroupedContainersResponse struct {
	Groups    []ContainerGroup `json:"groups"`
	Standalone []ContainerInfo  `json:"standalone"` // containers not in any compose project
}
